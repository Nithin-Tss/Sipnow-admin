import { createContext, useContext, useMemo } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const ctxValue = useMemo(
    () => ({
      user: null,
      loading: false,
      login: async () => {
        throw new Error("Not connected to a backend");
      },
      logout: () => {},
    }),
    [],
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
