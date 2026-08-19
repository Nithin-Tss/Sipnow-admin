import { createContext, useContext, useMemo, useState } from "react";

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

function mockUserFromEmail(email) {
  const name = email.split("@")[0] || "admin";
  return {
    id: "local-admin",
    firstName: name.charAt(0).toUpperCase() + name.slice(1),
    lastName: "User",
    email,
    role: "admin",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());
  const [loading, setLoading] = useState(false);

  const ctxValue = useMemo(
    () => ({
      user,
      loading,
      login: async (email) => {
        setLoading(true);
        try {
          const loggedInUser = mockUserFromEmail(email);
          localStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
          setUser(loggedInUser);
          return loggedInUser;
        } finally {
          setLoading(false);
        }
      },
      logout: () => {
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
