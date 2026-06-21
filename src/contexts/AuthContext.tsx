import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UserRole } from "@/types";
import { authApi, AuthUser } from "@/lib/services";
import { tokenStore, ApiError } from "@/lib/api";

export type { AuthUser };

type Profile = Record<string, unknown> | null;

interface RegisterResult {
  success: boolean;
  message?: string;
  pendingApproval?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStudent: boolean;
  isMentor: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (accessToken: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: Record<string, unknown>, role: UserRole) => Promise<RegisterResult>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  updateMe: (data: { name?: string; phone?: string; profilePicture?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "karigar_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if we have a token, validate it and rehydrate the session.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Optimistically restore cached user for instant UI, then verify.
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    authApi
      .me()
      .then(({ user: u, profile: p }) => {
        setUser(u);
        setProfile(p as unknown as Profile);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        tokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setProfile(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    try {
      const { user: u, token, refreshToken } = await authApi.login(email, password, role);
      tokenStore.set(token);
      if (refreshToken) tokenStore.setRefresh(refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      // Load profile (non-blocking for the redirect).
      authApi.me().then(({ profile: p }) => setProfile(p as unknown as Profile)).catch(() => {});
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      return { success: false, message };
    }
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    try {
      const { user: u, token, refreshToken } = await authApi.google(accessToken);
      tokenStore.set(token);
      if (refreshToken) tokenStore.setRefresh(refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      authApi.me().then(({ profile: p }) => setProfile(p as unknown as Profile)).catch(() => {});
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.";
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (data: Record<string, unknown>, role: UserRole): Promise<RegisterResult> => {
    try {
      const res = await authApi.register(data, role);
      // Students are activated immediately and logged straight in.
      if (res.token && res.user) {
        tokenStore.set(res.token);
        if (res.refreshToken) tokenStore.setRefresh(res.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setUser(res.user);
        authApi.me().then(({ profile: p }) => setProfile(p as unknown as Profile)).catch(() => {});
      }
      return { success: true, message: res.message, pendingApproval: res.pendingApproval };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setProfile(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateMe = useCallback(async (data: { name?: string; phone?: string; profilePicture?: string }) => {
    const updated = await authApi.updateMe(data);
    setUser((prev) => {
      const merged = prev ? { ...prev, ...updated } : updated;
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { user: u, profile: p } = await authApi.me();
      setUser(u);
      setProfile(p as unknown as Profile);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        isStudent: user?.role === "student",
        isMentor: user?.role === "mentor",
        isAdmin: user?.role === "admin",
        login,
        loginWithGoogle,
        register,
        logout,
        updateUser,
        updateMe,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
