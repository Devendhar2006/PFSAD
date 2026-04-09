import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, CircleX, GraduationCap, Lightbulb, MessageSquareWarning, TrendingUp, BarChart3, Activity } from "lucide-react";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

import api from "../api/client";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";

function statusMeta(status) {
  if (status === "Engaged") return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", pill: "green" };
  if (status === "At Risk") return { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", pill: "orange" };
  return { icon: CircleX, color: "text-rose-600", bg: "bg-rose-50", pill: "red" };
}

export default function StudentDashboard({ user, onLogout }) {
  const initialProfile = user?.studentRef;
  const [profile, setProfile] = useState(initialProfile);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const teacherComplaint =
    profile?.feedbackHistory?.[0]?.text ||
    profile?.feedbackText ||
    "No complaint from teacher at the moment.";

  const [form, setForm] = useState({
    attendance: profile?.attendance ?? 75,
    marks: profile?.marks ?? 70,
    behavior: profile?.behaviorRating ?? 3,
    feedbackText: profile?.feedbackText || "I am trying my best but I need better consistency."
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");



  // Load messages when profile changes
  useEffect(() => {
    async function fetchMessages() {
      if (!profile?._id) return;
      
      setLoadingMessages(true);
      try {
        const { data } = await api.get(`/messages/${profile._id}`);
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [profile?._id]);

  // Update form when profile changes
  useEffect(() => {
    setForm({
      attendance: profile?.attendance ?? 75,
      marks: profile?.marks ?? 70,
      behavior: profile?.behaviorRating ?? 3,
      feedbackText: profile?.feedbackText || "I am trying my best but I need better consistency."
    });
    setResult(null);
  }, [profile]);







  const trendData = useMemo(() => {
    return profile?.performanceTrend?.length
      ? profile.performanceTrend
      : [
          { term: "Term 1", marks: 62 },
          { term: "Term 2", marks: 67 },
          { term: "Term 3", marks: 70 },
          { term: "Term 4", marks: 73 },
          { term: "Term 5", marks: 76 },
          { term: "Term 6", marks: 79 }
        ];
  }, [profile]);

  const pieData = useMemo(() => {
    const confidence = result?.confidence || 0;
    return [
      { name: "Current Risk", value: Math.round(confidence * 100), color: "#ef4444" },
      { name: "Positive Zone", value: 100 - Math.round(confidence * 100), color: "#22c55e" }
    ];
  }, [result]);

  async function handlePredict(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        attendance: Number(form.attendance),
        marks: Number(form.marks),
        behavior: Number(form.behavior),
        feedbackText: form.feedbackText,
        studentId: profile?._id
      };

      const { data } = await api.post("/predict", payload);
      setResult(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const status = result?.status || profile?.engagementStatus || "Engaged";
  const confidence = result?.confidence ?? profile?.confidenceScore ?? 0;
  const reason = result?.reason || "Run a prediction to receive AI explanation.";
  const suggestions = result?.suggestions || ["Keep maintaining regular attendance and study rhythm."];
  const statusStyle = statusMeta(status);
  const StatusIcon = statusStyle.icon;

  // Attendance data for chart
  const attendanceData = useMemo(() => {
    return [
      { month: "Jan", attendance: profile?.attendance || 75 },
      { month: "Feb", attendance: Math.min(100, (profile?.attendance || 75) + 5) },
      { month: "Mar", attendance: Math.min(100, (profile?.attendance || 75) + 2) },
      { month: "Apr", attendance: profile?.attendance || 75 },
      { month: "May", attendance: Math.min(100, (profile?.attendance || 75) - 3) },
      { month: "Jun", attendance: Math.min(100, (profile?.attendance || 75) - 5) },
    ];
  }, [profile?.attendance]);

  // Pie chart for engagement metrics
  const engagementMetrics = useMemo(() => {
    return [
      { name: "Engaged Classes", value: Math.round((profile?.attendance || 75) * 0.8), color: "#22c55e" },
      { name: "Absent/Not Engaged", value: 100 - Math.round((profile?.attendance || 75) * 0.8), color: "#ef4444" }
    ];
  }, [profile?.attendance]);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Student Analytics Dashboard</h1>
          <p className="text-sm text-slate-600">Real-time engagement monitoring and performance insights</p>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Logout</button>
      </div>

      {/* ===================== SECTION 1: Student Info Card with Status ===================== */}
      <div className="mb-6 card card-hover overflow-hidden border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left: Student Info */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Student Profile</h3>
              <p className="text-2xl font-bold text-slate-900">{profile?.name || "N/A"}</p>
              <p className="text-sm text-slate-600 mt-1">{profile?.studentId}</p>
              <p className="text-sm text-slate-500 mt-2">{profile?.course || "General Studies"}</p>
            </div>

            {/* Middle: Engagement Status */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-xl bg-white/60 p-4 border border-slate-200">
              <StatusIcon className={`h-8 w-8 mb-2 ${statusStyle.color}`} />
              <p className="text-xs font-semibold text-slate-600 mb-1">Engagement Status</p>
              <p className={`status-pill ${statusStyle.pill} text-lg font-bold`}>{status}</p>
              <p className="text-xs text-slate-500 mt-2">Confidence: {Math.round(confidence * 100)}%</p>
            </motion.div>

            {/* Right: Risk Level Indicator */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-xl bg-white/60 p-4 border border-slate-200">
              <AlertTriangle className={`h-8 w-8 mb-2 ${
                confidence > 0.7 ? "text-red-600" : confidence > 0.4 ? "text-amber-600" : "text-green-600"
              }`} />
              <p className="text-xs font-semibold text-slate-600 mb-1">Risk Level</p>
              <p className={`font-bold ${
                confidence > 0.7 ? "text-red-600" : confidence > 0.4 ? "text-amber-600" : "text-green-600"
              }`}>
                {confidence > 0.7 ? "High" : confidence > 0.4 ? "Medium" : "Low"}
              </p>
              <p className="text-xs text-slate-500 mt-2">Score: {Math.round(confidence * 100)}/100</p>
            </motion.div>
          </div>
        </div>
      </div>



      {/* ===================== SECTION 2: AI Insights ===================== */}
      <div className="mb-6 card card-hover p-6 border-2 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Insights & Prediction</h3>
            <p className="text-sm text-slate-600">Smart analysis based on current performance metrics</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Prediction Button */}
          <button 
            className="btn-primary w-full md:w-auto"
            onClick={handlePredict}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Run AI Prediction"}
          </button>

          {/* Analysis Results */}
          {loading && <Loader label="Analyzing engagement pattern" />}

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white p-4 border border-amber-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">📊 Analysis:</p>
              <p className="text-sm text-slate-700 mb-4">{reason}</p>

              <p className="text-sm font-semibold text-slate-900 mb-2">💡 Suggestions:</p>
              <ul className="space-y-1">
                {Array.isArray(suggestions) && suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-amber-600">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>

      {/* ===================== SECTION 3: Analytics Charts ===================== */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Analytics
        </h2>
        
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Performance Trend Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-2 card card-hover p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance Trend
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="term" stroke="#64748b" />
                  <YAxis domain={[30, 100]} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="marks" stroke="#2563eb" strokeWidth={3} dot={{ fill: "#2563eb", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Engagement Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card card-hover p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Engagement Ratio
            </h3>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={engagementMetrics} dataKey="value" nameKey="name" outerRadius={80}>
                    {engagementMetrics.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Attendance Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card card-hover p-6 mt-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Attendance Trend
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="attendance" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ===================== SECTION 4: Feedback & Logs ===================== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Messages from Teachers - Chat Style */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="card card-hover p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-amber-600" />
            📩 Messages from Teachers
            {messages?.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {messages.length} {messages.length === 1 ? "New" : "Messages"}
              </span>
            )}
          </h3>
          {loadingMessages ? (
            <Loader label="Loading messages" />
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {messages?.length ? (
                messages.map((msg, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden border-l-4 border-red-500 shadow-lg"
                  >
                    {/* Teacher Message - Gradient Background */}
                    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-white">👨‍🏫 {msg.teacherName}</p>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          Important
                        </span>
                      </div>
                      <p className="text-white text-sm leading-relaxed mb-3">{msg.message}</p>
                      <p className="text-blue-100 text-xs">
                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>


                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  🎉 No messages yet. Teachers can send you important updates here!
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Prediction Logs */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card card-hover p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Prediction Logs
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {profile?.predictionLogs?.length ? (
              profile.predictionLogs.slice().reverse().map((log, idx) => (
                <div key={idx} className={`rounded-lg p-3 border ${
                  log.engagementStatus === "Engaged" ? "bg-green-50 border-green-200" :
                  log.engagementStatus === "At Risk" ? "bg-amber-50 border-amber-200" :
                  "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-semibold ${
                      log.engagementStatus === "Engaged" ? "text-green-700" :
                      log.engagementStatus === "At Risk" ? "text-amber-700" :
                      "text-red-700"
                    }`}>{log.engagementStatus}</p>
                    <p className="text-xs text-slate-600">{Math.round(log.confidenceScore * 100)}%</p>
                  </div>
                  <p className="text-xs text-slate-700">{log.explanation || log.feedbackText}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No prediction logs available</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
