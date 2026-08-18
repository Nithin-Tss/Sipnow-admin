import { createContext, useContext, useMemo, useState } from "react";
import { apiFetch, saveToken, clearToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const ctxValue = useMemo(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        setLoading(true);
        try {
          const { token, user: loggedInUser } = await apiFetch(
            "/api/auth/login",
            {
              method: "POST",
              body: JSON.stringify({ email, password }),
            },
          );
          saveToken(token);
          setUser(loggedInUser);
          return loggedInUser;
        } finally {
          setLoading(false);
        }
      },
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
