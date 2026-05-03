import { MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { apiOpenDirectConversation } from "../../lib/api";
import {
  marketplaceContactButtonLabel,
  marketplaceContactDmBody,
  marketplaceContactKind,
  type MarketplaceListingApiType,
} from "../../lib/marketplaceContactSeller";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  sellerUserId: string | null | undefined;
  listingTitle: string;
  listingType: MarketplaceListingApiType;
  listingDescription?: string;
  /** Демо или нет связи — кнопка неактивна с подсказкой */
  disabledReason?: string | null;
  className?: string;
};

export default function MarketplaceContactSellerButton({
  sellerUserId,
  listingTitle,
  listingType,
  listingDescription = "",
  disabledReason,
  className = "",
}: Props) {
  const navigate = useNavigate();
  const { user, isAuthenticated, authReady } = useAuth();
  const [busy, setBusy] = useState(false);

  const desc = listingDescription || "";
  const kind = marketplaceContactKind(listingType, desc);
  const label = marketplaceContactButtonLabel(kind);
  const noSeller = !sellerUserId;
  const isSelf = Boolean(user?.id && sellerUserId && user.id === sellerUserId);

  const disabled =
    !!disabledReason || noSeller || isSelf || busy || !authReady;

  const hint =
    disabledReason ??
    (noSeller
      ? "Нет аккаунта автора — откройте объявление, созданное в системе через «Разместить объявление»."
      : isSelf
        ? "Это ваше объявление."
        : undefined);

  const handle = async () => {
    if (disabledReason || noSeller || isSelf || busy || !authReady) return;
    if (!sellerUserId) return;

    if (!isAuthenticated || !user) {
      navigate("/login", {
        state: { from: window.location.pathname + window.location.search },
      });
      return;
    }

    setBusy(true);
    try {
      const body = marketplaceContactDmBody(listingTitle, kind);
      const r = await apiOpenDirectConversation(sellerUserId, body);
      navigate(`/messages/${r.conversationId}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось открыть переписку");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      title={hint}
      aria-label={hint ? `${label}. ${hint}` : label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handle();
      }}
      className={
        `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors ` +
        `bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 ` +
        `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-auto ` +
        className
      }
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <MessageCircle className="w-4 h-4 shrink-0" aria-hidden />}
      {busy ? "Открываем чат…" : label}
    </button>
  );
}
