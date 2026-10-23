import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredToken, getStoredToken, saveToken, saveUser, getStoredUser, clearStoredUser } from "../lib/auth";
import { login as loginRequest, type AuthUser } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  atualizarUsuario: (dados: AuthUser) => Promise<void>;
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
    await Promise.all([saveToken(response.token), saveUser(response)]);
    setToken(response.token);
    setUser(response);
    return response;
  }

  async function signOut() {
    await Promise.all([clearStoredToken(), clearStoredUser()]);
    setToken(null);
    setUser(null);
  }

  // Depois de editar o perfil: grava e já mostra o nome/e-mail novos em todas as telas
  async function atualizarUsuario(dados: AuthUser) {
    await saveUser(dados);
    setUser(dados);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signOut, atualizarUsuario }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
