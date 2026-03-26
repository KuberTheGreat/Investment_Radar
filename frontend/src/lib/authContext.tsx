"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface AuthContextType {
  token: string | null;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.backendToken && session?.user?.id) {
      setToken(session.backendToken);
      setUserId(session.user.id);
      // For legacy sync with unmounted api.ts interceptors across the lifecycle bounds
      localStorage.setItem("token", session.backendToken);
    } else {
      setToken(null);
      setUserId(null);
      localStorage.removeItem("token");
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ token, userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context as AuthContextType;
}
