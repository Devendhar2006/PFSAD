import { useState } from "react";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import {
  BadgeCheck,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import Loader from "../components/Loader";

function isGmailAddress(email = "") {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(email.trim());
}

export default function LoginPage({ onLogin, onRegister, onFixLogin, onGoogleLogin, onClearError, error }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isGmailAddress(normalizedEmail)) {
      onClearError?.();
      setLocalError("Use your Google Mail address to continue (example: name@gmail.com).");
      return;
    }

    onClearError?.();
    setLocalError("");

    setSubmitting(true);
    try {
      if (mode === "register") {
        if (!name.trim()) {
          setLocalError("Please enter your full name.");
          return;
        }

        await onRegister({
          name: name.trim(),
          email: normalizedEmail,
          password: password.trim(),
          role,
          course: role === "student" ? course.trim() : ""
        });

        // Show success modal after registration
        setRegisteredEmail(normalizedEmail);
        setShowSuccessModal(true);
        setEmail("");
        setPassword("");
        setName("");
        setCourse("");
      } else {
        await onLogin(normalizedEmail, password.trim());
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseSuccessModal() {
    setShowSuccessModal(false);
    setMode("signin");
    setEmail(registeredEmail);
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) {
      setLocalError("Google sign-in did not return a credential. Try again.");
      return;
    }

    setLocalError("");
    setGoogleSubmitting(true);
    try {
      await onGoogleLogin(response.credential);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleFixLogin() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setLocalError("Enter your email and password first.");
      return;
    }

    onClearError?.();
    setLocalError("");
    setSubmitting(true);
    try {
      await onFixLogin?.(normalizedEmail, password.trim());
    } finally {
      setSubmitting(false);
    }
  }

  const pageError = localError || error;

  return (
    <>
      {showSuccessModal ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md rounded-2xl p-8 text-center"
          >
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <BadgeCheck className="h-8 w-8 text-emerald-600" strokeWidth={2.2} />
              </div>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-slate-900">Registration Successful!</h2>
            <p className="mb-6 text-sm text-slate-600">
              Your account has been created successfully. You can now sign in with your credentials.
            </p>

            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Your email:</p>
              <p className="font-mono">{registeredEmail}</p>
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleCloseSuccessModal}
            >
              Proceed to Sign In
            </button>
          </motion.div>
        </div>
      ) : null}
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 lg:py-12">
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-hover overflow-hidden"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 p-8 text-white">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-cyan-300/20 blur-md" />

            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8" strokeWidth={2.2} />
            </div>

            <div className="flex items-center gap-2 text-blue-100">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-medium tracking-[0.18em]">ACADEMIC INTELLIGENCE SUITE</p>
            </div>

            <h1 className="mt-3 text-4xl font-bold leading-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              EduSense AI
            </h1>

            <p className="mt-3 max-w-md text-sm text-blue-100">
              Student Disengagement Detection System with role-based dashboards for students and teachers.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-blue-50">
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1">Realtime Alerts</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1">Role-Specific Dashboards</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1">Gmail Access Control</span>
            </div>
          </div>

          <div className="space-y-5 p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Demo Credentials</p>
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Access
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <p className="font-semibold text-slate-800">Teacher Account</p>
              <p>teacher.edusense.ai@gmail.com / Teacher@123</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
                onClick={() => {
                  setEmail("teacher.edusense.ai@gmail.com");
                  setPassword("Teacher@123");
                  onClearError?.();
                  setLocalError("");
                }}
              >
                Use teacher credentials
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <p className="font-semibold text-slate-800">Student Account</p>
              <p>edu0001@gmail.com / Student@123</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
                onClick={() => {
                  setEmail("edu0001@gmail.com");
                  setPassword("Student@123");
                  onClearError?.();
                  setLocalError("");
                }}
              >
                Use student credentials
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-hover p-8"
        >
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <p className="text-sm font-medium text-slate-700">Secure Role-Based Login</p>
          </div>

          <p className="mb-6 text-sm text-slate-500">
            Sign in to access personalized student insights or the complete teacher monitoring suite.
          </p>

          <div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 text-sm">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 font-semibold transition ${mode === "signin" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              onClick={() => {
                setMode("signin");
                onClearError?.();
                setLocalError("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 font-semibold transition ${mode === "register" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              onClick={() => {
                setMode("register");
                onClearError?.();
                setLocalError("");
              }}
            >
              Register
            </button>
          </div>

          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-700">
            Sign in with your registered Google Mail address only.
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  className="input"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    onClearError?.();
                    setLocalError("");
                  }}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input"
                  style={{ paddingLeft: "2.5rem" }}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    onClearError?.();
                    setLocalError("");
                  }}
                  placeholder="Enter your Gmail address"
                  required
                />
              </div>
              {email && !isGmailAddress(email) ? (
                <p className="mt-1 text-xs text-red-600">Use a Google Mail address (example: name@gmail.com).</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pr-11"
                  style={{ paddingLeft: "2.5rem" }}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    onClearError?.();
                    setLocalError("");
                  }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "register" ? (
                <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
              ) : null}
            </div>

            {mode === "register" ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    className="input"
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value);
                      onClearError?.();
                      setLocalError("");
                    }}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                {role === "student" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
                    <input
                      className="input"
                      type="text"
                      value={course}
                      onChange={(event) => {
                        setCourse(event.target.value);
                        onClearError?.();
                        setLocalError("");
                      }}
                      placeholder="Example: B.Sc AI"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" />
                Remember this device
              </label>
              <span className="font-medium text-slate-600">Protected Session</span>
            </div>

            {pageError ? (
              <div className="space-y-2">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</p>
                {mode === "signin" && pageError === "Invalid credentials" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-700 transition hover:text-brand-800"
                    onClick={handleFixLogin}
                    disabled={submitting}
                  >
                    Update this account to the password entered above and sign in
                  </button>
                ) : null}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? (mode === "register" ? "Creating account..." : "Signing in...") : mode === "register" ? "Create Account" : "Login Securely"}
            </button>
            {submitting ? <Loader label={mode === "register" ? "Creating account" : "Authenticating"} /> : null}

            <div className="relative py-1">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
              <span className="relative mx-auto block w-fit bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                OR
              </span>
            </div>

            {googleClientId ? (
              <div className="space-y-2">
                <div className="flex justify-center rounded-xl border border-slate-200 bg-white px-2 py-2">
                  <GoogleLogin
                    onSuccess={handleGoogleCredential}
                    onError={() => setLocalError("Google sign-in failed. Try again.")}
                    text="signin_with"
                    shape="pill"
                    theme="outline"
                    width="320"
                  />
                </div>
                {googleSubmitting ? <Loader label="Verifying Google account" /> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
                  disabled
                >
                  Continue with Google
                </button>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID in frontend env.
                </p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
      </>
    );
  }
