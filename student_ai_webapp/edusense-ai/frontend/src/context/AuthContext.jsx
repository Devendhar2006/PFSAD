import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("edusense_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/me");
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem("edusense_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post("/login", { email, password });
    localStorage.setItem("edusense_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/register", payload);
    localStorage.setItem("edusense_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function loginWithGoogle(credential) {
    const { data } = await api.post("/google-login", { credential });
    localStorage.setItem("edusense_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function resetPassword(email, password) {
    const { data } = await api.post("/reset-password", { email, password });
    return data;
  }

  function logout() {
    localStorage.removeItem("edusense_token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, loginWithGoogle, resetPassword, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
