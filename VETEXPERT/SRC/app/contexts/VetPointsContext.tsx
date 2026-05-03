import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { apiFetch } from "../../lib/api";
import { computeEarnedBadges, type ForumActivityStats } from "../../lib/computeEarnedBadges";
import { useAuth } from "./AuthContext";

interface Transaction {
  id: string;
  type: "earn" | "spend" | "transfer";
  amount: number;
  reason: string;
  date: string;
}

/** Ярлык в профиле: автодостижение или подарок (дарёные пока локально через addBadge). */
export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  duration: number;
  expiresAt?: string;
  source?: "earned" | "gift";
}

type LedgerPayload = {
  currencyDisplayName: string;
  balance: number;
  ledger: {
    items: Array<{
      id: string;
      delta: number;
      reason: string;
      createdAt: string;
      balanceAfter: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
};

export type VetcoinSpendActionKind = "TOOL_DOSAGE" | "TOOL_ANALYZER" | "BADGE_PURCHASE";

interface VetPointsContextType {
  currencyDisplayName: string;
  balance: number;
  serverBalance: number;
  transactions: Transaction[];
  /** Автоматические + подарочные ярлоки без дубликатов id (авто важнее). */
  badges: Badge[];
  /** Пока нет API статистики — 0 */
  urgentHelps: number;
  refreshVetcoins: () => Promise<void>;
  /** Трата через базу данных (цену задаёт сервер). Ярлыки: только `gift: true`. */
  spendServer: (payload: {
    action: VetcoinSpendActionKind;
    badgeId?: string;
    gift?: boolean;
  }) => Promise<boolean>;
  /** @deprecated Никаких «начислений» с клиента; только refresh. */
  earnPoints: (amount: number, reason: string) => void;
  transferPoints: (amount: number, toUser: string) => boolean;
  /** Локально: получен подарённый ярлык (до появления API «входящие подарки»). */
  addBadge: (badge: Badge) => void;
  addUrgentHelp: () => void;
}

const VetPointsContext = createContext<VetPointsContextType | undefined>(undefined);

export function VetPointsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [currencyDisplayName, setCurrencyDisplayName] = useState("VetCoin");
  const [serverBalance, setServerBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [giftBadges, setGiftBadges] = useState<Badge[]>([]);
  const [forumStats, setForumStats] = useState<ForumActivityStats | null>(null);

  const balance = Math.max(0, serverBalance);
  const urgentHelps = 0;

  const ledgerToTransactions = useCallback((payload: LedgerPayload): Transaction[] => {
    return payload.ledger.items.map((row) => ({
      id: row.id,
      type: row.delta >= 0 ? ("earn" as const) : ("spend" as const),
      amount: row.delta,
      reason: row.reason,
      date: new Date(row.createdAt).toLocaleString("ru-RU"),
    }));
  }, []);

  const refreshForumStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const r = await apiFetch<ForumActivityStats>("/api/users/me/forum-stats");
      setForumStats({
        threadsCreated: Number(r.threadsCreated) || 0,
        postsCreated: Number(r.postsCreated) || 0,
      });
    } catch {
      setForumStats({ threadsCreated: 0, postsCreated: 0 });
    }
  }, [isAuthenticated]);

  const refreshVetcoins = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiFetch<LedgerPayload>("/api/users/me/vetcoins");
      setCurrencyDisplayName(data.currencyDisplayName || "VetCoin");
      setServerBalance(Number(data.balance) || 0);
      setTransactions(ledgerToTransactions(data));
    } catch {
      /* без шума для гостя */
    }
    await refreshForumStats();
  }, [isAuthenticated, ledgerToTransactions, refreshForumStats]);

  useEffect(() => {
    if (!isAuthenticated) {
      setServerBalance(0);
      setTransactions([]);
      setGiftBadges([]);
      setForumStats(null);
      return;
    }
    void refreshVetcoins();
  }, [isAuthenticated, refreshVetcoins]);

  const earnedBadges = useMemo((): Badge[] => {
    if (!user) return [];
    const rows = computeEarnedBadges({
      emailVerified: user.emailVerified === true,
      role: user.role,
      forumStats,
    });
    return rows.map((b) => ({ ...b, source: "earned" as const }));
  }, [user?.id, user?.emailVerified, user?.role, forumStats]);

  const badges = useMemo((): Badge[] => {
    const m = new Map<string, Badge>();
    for (const b of earnedBadges) {
      m.set(b.id, b);
    }
    for (const b of giftBadges) {
      if (!m.has(b.id)) {
        m.set(b.id, { ...b, source: b.source ?? "gift" });
      }
    }
    return Array.from(m.values());
  }, [earnedBadges, giftBadges]);

  const spendServer = useCallback(
    async (payload: {
      action: VetcoinSpendActionKind;
      badgeId?: string;
      gift?: boolean;
    }): Promise<boolean> => {
      if (!isAuthenticated) return false;
      try {
        await apiFetch<{ balance: number }>("/api/users/me/vetcoins/spend", {
          method: "POST",
          json: payload,
        });
        await refreshVetcoins();
        return true;
      } catch {
        return false;
      }
    },
    [isAuthenticated, refreshVetcoins],
  );

  const earnPoints = (_amount: number, _reason: string) => {
    void refreshVetcoins();
  };

  const transferPoints = (_amount: number, _toUser: string): boolean => {
    return false;
  };

  const addBadge = (badge: Badge) => {
    let expiresAt: string | undefined;
    if (badge.duration > 0) {
      const d = new Date();
      d.setDate(d.getDate() + badge.duration);
      expiresAt = d.toISOString();
    }
    setGiftBadges((prev) => [...prev, { ...badge, expiresAt, source: "gift" }]);
  };

  const addUrgentHelp = () => {};

  return (
    <VetPointsContext.Provider
      value={{
        currencyDisplayName,
        balance,
        serverBalance,
        transactions,
        badges,
        urgentHelps,
        refreshVetcoins,
        spendServer,
        earnPoints,
        transferPoints,
        addBadge,
        addUrgentHelp,
      }}
    >
      {children}
    </VetPointsContext.Provider>
  );
}

export function useVetPoints() {
  const context = useContext(VetPointsContext);
  if (!context) throw new Error("useVetPoints must be used within VetPointsProvider");
  return context;
}
