import { createContext, useContext, useMemo, useState } from "react";
import { apiFetch, setToken } from "../lib/apiClient";

const AuthContext = createContext(null);

const SESSION_KEY = "sipnow_admin_session";

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());
  const [loading, setLoading] = useState(false);

  const ctxValue = useMemo(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        setLoading(true);
        try {
          const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          if (data.user.role !== "admin") {
            throw new Error("This account does not have admin access.");
          }
          const [firstName = "", ...rest] = (data.user.name || "").split(" ");
          const loggedInUser = {
            ...data.user,
            firstName,
            lastName: rest.join(" "),
          };
          setToken(data.token);
          localStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
          setUser(loggedInUser);
          return loggedInUser;
        } finally {
          setLoading(false);
        }
      },
      logout: () => {
        setToken(null);
        localStorage.removeItem(SESSION_KEY);
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
