import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredToken, getStoredToken, saveToken, saveUser, getStoredUser, clearStoredUser } from "../lib/auth";
import { login as loginRequest, type AuthUser } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const [storedToken, storedUser] = await Promise.all([getStoredToken(), getStoredUser()]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(storedUser);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  async function signIn(email: string, senha: string) {
    const response = await loginRequest(email, senha);
    console.log("TOKEN RECEBIDO:", response.token);
    await Promise.all([saveToken(response.token), saveUser(response)]);
     console.log("TOKEN SALVO:", await getStoredToken());
    setToken(response.token);
    setUser(response);
    return response;
  }

  async function signOut() {
    await Promise.all([clearStoredToken(), clearStoredUser()]);
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signOut }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
