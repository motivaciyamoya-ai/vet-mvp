import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  apiFetch,
  clearTokens,
  getRefreshToken,
  setTokens,
} from "../../lib/api";
import type { PublicModerationDto } from "../../lib/moderationUi";

export interface User {
  id: string;
  email: string;
  name: string;
  specialty: string;
  city: string;
  country: string;
  /** ISO-строка: дата регистрации аккаунта (User.createdAt). */
  joinedAt?: string;
  stats?: {
    forumThreadsCreated: number;
    forumPostsCreated: number;
    acceptedSolutionsCount: number;
    thanksReceivedCount: number;
    articlesPublished: number;
    articleCommentsCreated: number;
    listingsCreated: number;
    listingMessagesSent: number;
    sosRequestsCreated: number;
    lobbyMessagesSent: number;
    directMessagesSent: number;
  };
  /** Для редактирования профиля (справочники стран и должностей). */
  countryId?: string;
  jobTitleId?: string;
  avatar?: string | null;
  /** ГГГГ-ММ-ДД с сервера (если задан в профиле). */
  birthDate?: string | null;
  role?: string;
  emailVerified?: boolean;
  /** Публичное состояние модерации аккаунта (бейджи/баннер совпадают с API). */
  moderation?: PublicModerationDto;
}

/** Результат входа/регистрации: либо успех, либо текст для показа пользователю (не глотать сеть/валидацию). */
export type AuthActionResult = { ok: true } | { ok: false; error: string };

interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

interface LoginRegisterResponse extends AuthTokensResponse {
  user: { id: string; email: string; role: string; emailVerified?: boolean };
}

interface MeResponse {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt?: string;
  stats?: User["stats"];
  moderation: PublicModerationDto;
  profile: {
    countryId: string;
    jobTitleId: string;
    displayName: string;
    city: string;
    avatarUrl?: string | null;
    birthDate?: string | Date | null;
    country: { nameRu: string };
    jobTitle: { nameRu: string };
  };
}

function mapMe(me: MeResponse): User {
  return {
    id: me.id,
    email: me.email,
    name: me.profile.displayName,
    specialty: me.profile.jobTitle.nameRu,
    city: me.profile.city,
    country: me.profile.country.nameRu,
    joinedAt: typeof me.createdAt === "string" ? me.createdAt : undefined,
    stats: me.stats,
    countryId: me.profile.countryId,
    jobTitleId: me.profile.jobTitleId,
    avatar: me.profile.avatarUrl,
    birthDate:
      me.profile.birthDate == null
        ? null
        : typeof me.profile.birthDate === "string"
          ? me.profile.birthDate.slice(0, 10)
          : new Date(me.profile.birthDate as Date).toISOString().slice(0, 10),
    role: me.role,
    emailVerified: me.emailVerified,
    moderation: me.moderation,
  };
}

function humanizeClientError(raw: string): string {
  const t = raw.trim();
  const low = t.toLowerCase();
  if (!t || low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed")) {
    if (!import.meta.env.DEV) {
      return "Сервис временно недоступен. Проверьте интернет-соединение и попробуйте снова через несколько минут.";
    }
    return "Не удалось связаться с сервером API (локально убедитесь, что dev-прокси /api доступен для NestJS).";
  }
  if (low.includes("неверный email") || low.includes("unauthorized") || low.includes("401")) {
    return "Неверный email или пароль.";
  }
  return t.length > 400 ? `${t.slice(0, 400)}…` : t;
}

interface AuthContextType {
  user: User | null;
  authReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (userData: RegisterPayload) => Promise<AuthActionResult>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  city: string;
  countryId: string;
  jobTitleId: string;
  birthDate: string;
  policyAccepted: boolean;
}

const PROFILE_STORAGE_KEY = "vetmvp_user_profile";
const LEGACY_PROFILE_KEY = "user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem("vetmvp_access"));

  const hydrateUser = useCallback(async () => {
    const me = await apiFetch<MeResponse>("/api/users/me");
    const u = mapMe(me);
    setUser(u);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(u));
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    return u;
  }, []);

  useEffect(() => {
    const access = localStorage.getItem("vetmvp_access");
    localStorage.removeItem(LEGACY_PROFILE_KEY);

    if (!access) {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      setUser(null);
      setAuthReady(true);
      return;
    }

    setAuthReady(false);
    (async () => {
      try {
        await hydrateUser();
      } catch {
        clearTokens();
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    })();
  }, [hydrateUser]);

  const login = async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const res = await apiFetch<LoginRegisterResponse>("/api/auth/login", {
        method: "POST",
        json: { email: email.trim(), password },
      });
      setTokens(res.accessToken, res.refreshToken);
      setUser(null);
      try {
        await hydrateUser();
      } catch (e) {
        clearTokens();
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        setUser(null);
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          error: import.meta.env.DEV
            ? `Не удалось загрузить профиль после входа. Технически: ${msg}`
            : "Не удалось загрузить профиль после входа. Попробуйте войти заново через минуту.",
        };
      }
      return { ok: true };
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      return { ok: false, error: humanizeClientError(raw) };
    }
  };

  const register = async (payload: RegisterPayload): Promise<AuthActionResult> => {
    try {
      const res = await apiFetch<LoginRegisterResponse>("/api/auth/register", {
        method: "POST",
        json: {
          email: payload.email.trim(),
          password: payload.password,
          displayName: payload.displayName,
          city: payload.city,
          countryId: payload.countryId,
          jobTitleId: payload.jobTitleId,
          birthDate: payload.birthDate.trim(),
          policyAccepted: payload.policyAccepted,
        },
      });
      setTokens(res.accessToken, res.refreshToken);
      setUser(null);
      try {
        await hydrateUser();
      } catch (e) {
        clearTokens();
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        setUser(null);
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          error: `Регистрация прошла, но профиль не подтянулся (/api/users/me): ${msg}`,
        };
      }
      return { ok: true };
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      return { ok: false, error: humanizeClientError(raw) };
    }
  };

  const refreshProfile = useCallback(async () => {
    await hydrateUser();
  }, [hydrateUser]);

  const logout = () => {
    const refresh = getRefreshToken();
    setUser(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    clearTokens();
    setAuthReady(true);
    if (refresh) {
      void apiFetch("/api/auth/logout", {
        method: "POST",
        json: { refreshToken: refresh },
      }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAuthenticated: authReady && !!user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
