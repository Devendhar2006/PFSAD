import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "./context/AuthContext";
import Loader from "./components/Loader";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  const { user, loading, login, register, loginWithGoogle, resetPassword, logout } = useAuth();
  const [loginError, setLoginError] = useState("");
  const role = (user?.role || "").toLowerCase();

  function clearLoginError() {
    setLoginError("");
  }

  async function handleLogin(email, password) {
    try {
      setLoginError("");
      await login(email, password);
    } catch (error) {
      setLoginError(error.response?.data?.message || "Login failed");
    }
  }

  async function handleGoogleLogin(credential) {
    try {
      setLoginError("");
      await loginWithGoogle(credential);
    } catch (error) {
      setLoginError(error.response?.data?.message || "Google login failed");
    }
  }

  async function handleRegister(payload) {
    try {
      setLoginError("");
      await register(payload);
    } catch (error) {
      setLoginError(error.response?.data?.message || "Registration failed");
    }
  }

  async function handleFixLogin(email, password) {
    try {
      setLoginError("");
      await resetPassword(email, password);
      await login(email, password);
    } catch (error) {
      setLoginError(error.response?.data?.message || "Unable to update password");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="Preparing app" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        onFixLogin={handleFixLogin}
        onGoogleLogin={handleGoogleLogin}
        onClearError={clearLoginError}
        error={loginError}
      />
    );
  }

  if (role !== "teacher" && role !== "student") {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <div className="card w-full p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Unable to load dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Invalid user role detected. Please sign in again.</p>
          <button className="btn-primary mt-4" onClick={logout}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/student"
        element={role === "student" ? <StudentDashboard user={user} onLogout={logout} /> : <Navigate to="/teacher" />}
      />
      <Route
        path="/teacher"
        element={role === "teacher" ? <TeacherDashboard user={user} onLogout={logout} /> : <Navigate to="/student" />}
      />
      <Route path="*" element={<Navigate to={role === "teacher" ? "/teacher" : "/student"} />} />
    </Routes>
  );
}
