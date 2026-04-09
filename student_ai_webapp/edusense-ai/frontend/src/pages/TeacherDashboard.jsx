import { useEffect, useMemo, useState, useRef } from "react";
import { AlertTriangle, Search, Plus, CheckCircle, MessageSquare, RefreshCw, X } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Line,
  LineChart
} from "recharts";

import api from "../api/client";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import TeacherSidebar from "../components/TeacherSidebar";
import AddStudentModal from "../components/AddStudentModal";

const DEFAULT_ANALYTICS = {
  totalStudents: 0,
  engaged: 0,
  atRisk: 0,
  disengaged: 0
};

function statusPill(status) {
  if (status === "Engaged") return "status-pill green";
  if (status === "At Risk") return "status-pill orange";
  return "status-pill red";
}

export default function TeacherDashboard({ user, onLogout }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingDisengagement, setCheckingDisengagement] = useState(false);
  const [disengagementResult, setDisengagementResult] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageStudent, setMessageStudent] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [dashboardError, setDashboardError] = useState("");

  function handleSelectStudent(studentId, nextTab = activeTab) {
    setSelectedStudent(studentId);
    setDisengagementResult(null);
    setActiveTab(nextTab);
  }

  async function loadDashboardData(preferredStudentId = selectedStudent) {
    setLoading(true);
    try {
      const [studentsRes, analyticsRes] = await Promise.all([
        api.get("/students"),
        api.get("/analytics")
      ]);

      const nextStudents = studentsRes.data || [];
      setAllStudents(nextStudents);
      setStudents(nextStudents);
      setAnalytics(analyticsRes.data || DEFAULT_ANALYTICS);
      setDashboardError("");

      if (!nextStudents.length) {
        setSelectedStudent(null);
        setDetail(null);
        setDisengagementResult(null);
        return;
      }

      const resolvedStudentId =
        preferredStudentId && nextStudents.some((student) => student._id === preferredStudentId)
          ? preferredStudentId
          : nextStudents[0]._id;

      setSelectedStudent(resolvedStudentId);
    } catch {
      setAnalytics(DEFAULT_ANALYTICS);
      setDashboardError("Unable to refresh student data right now. Showing the last loaded list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === "students" || activeTab === "analytics" || activeTab === "alerts") {
      loadDashboardData(selectedStudent);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedStudent) return;

    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const { data } = await api.get(`/student/${selectedStudent}`);
        setDetail(data);
      } finally {
        setLoadingDetail(false);
      }
    }

    loadDetail();
  }, [selectedStudent]);

  // Removed auto-filter - search only happens on "Apply" or Enter key

  async function applyFilters() {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredStudents = allStudents.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.name.toLowerCase().includes(normalizedSearch) ||
        student.studentId.toLowerCase().includes(normalizedSearch);
      const matchesRisk = riskFilter === "all" || student.engagementStatus === riskFilter;

      return matchesSearch && matchesRisk;
    });

    setStudents(filteredStudents);

    if (filteredStudents.length && !filteredStudents.find((item) => item._id === selectedStudent)) {
      handleSelectStudent(filteredStudents[0]._id);
    }

    if (!filteredStudents.length) {
      setSelectedStudent(null);
      setDetail(null);
      setDisengagementResult(null);
    }
  }

  async function checkDisengagement() {
    if (!detail) return;
    setCheckingDisengagement(true);
    setDisengagementResult(null);
    try {
      const response = await api.post("/predict", {
        studentId: detail._id,
        attendance: detail.attendance,
        marks: detail.marks,
        behavior: detail.behaviorRating,
        feedbackText: detail.feedbackText
      });
      setDisengagementResult(response.data);
      // Reload student detail to get fresh data
      const { data } = await api.get(`/student/${detail._id}`);
      setDetail(data);
    } finally {
      setCheckingDisengagement(false);
    }
  }

  async function handleStudentAdded(newStudent) {
    await loadDashboardData(newStudent._id);
    handleSelectStudent(newStudent._id, "analytics");
  }

  function openMessageModal(student) {
    setMessageStudent(student);
    setMessageText("");
    setMessageError("");
    setShowMessageModal(true);
  }

  function closeMessageModal() {
    setShowMessageModal(false);
    setMessageStudent(null);
    setMessageText("");
    setMessageError("");
  }

  async function handleSendMessage() {
    if (!messageText.trim()) {
      setMessageError("Message cannot be empty");
      return;
    }

    if (!messageStudent) {
      setMessageError("No student selected");
      return;
    }

    setSendingMessage(true);
    setMessageError("");

    try {
      await api.post("/send-message", {
        studentId: messageStudent._id,
        teacherId: user.id,
        teacherName: user.name,
        studentName: messageStudent.name,
        message: messageText.trim()
      });

      closeMessageModal();
      setMessageText("");
    } catch (error) {
      setMessageError(error.response?.data?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }

  async function runPredictions() {
    if (students.length === 0) {
      setImportMessage("❌ No students to predict");
      return;
    }

    setCheckingDisengagement(true);
    setImportMessage("🔄 Running predictions please wait...");

    try {
      let predictedCount = 0;
      let failedCount = 0;

      // Process predictions sequentially
      for (const student of students) {
        try {
          const predictPayload = {
            studentId: student._id,
            attendance: parseFloat(student.attendance) || 75,
            marks: parseFloat(student.marks) || 70,
            behavior: parseInt(student.behaviorRating) || 3,
            feedbackText: student.feedbackText || ""
          };

          console.log(`Predicting for ${student.name}:`, predictPayload);

          const res = await api.post('/predict', predictPayload);
          console.log(`✓ Predicted ${student.name}:`, res.data);
          predictedCount++;
        } catch (err) {
          console.error(`✗ Failed to predict for ${student.name}:`, err);
          failedCount++;
        }
      }

      setImportMessage(`✅ Predictions complete: ${predictedCount} students done${failedCount > 0 ? `, ${failedCount} failed` : ''}`);

      // Wait a moment then reload
      setTimeout(async () => {
        try {
          const [studentsRes, analyticsRes] = await Promise.all([
            api.get('/students'),
            api.get('/analytics')
          ]);
          setStudents(studentsRes.data || []);
          setAnalytics(analyticsRes.data || DEFAULT_ANALYTICS);
        } catch (err) {
          console.error("Failed to reload:", err);
      }
      }, 500);

    } catch (error) {
      console.error("Prediction error:", error);
      setImportMessage(`❌ Error: ${error.message}`);
    } finally {
      setCheckingDisengagement(false);
    }
  }

  useEffect(() => {
    if (!allStudents.length) return;
    applyFilters();
  }, [allStudents]);

  const pieData = useMemo(() => {
    return [
      { name: "Engaged", value: analytics?.engaged || 0, color: "#22c55e" },
      { name: "At Risk", value: analytics?.atRisk || 0, color: "#f59e0b" },
      { name: "Disengaged", value: analytics?.disengaged || 0, color: "#ef4444" }
    ];
  }, [analytics]);

  const totalStudents = analytics?.totalStudents || 0;
  const engagedPct = totalStudents ? Math.round(((analytics?.engaged || 0) / totalStudents) * 100) : 0;
  const atRiskPct = totalStudents ? Math.round(((analytics?.atRisk || 0) / totalStudents) * 100) : 0;
  const disengagedPct = totalStudents ? Math.round(((analytics?.disengaged || 0) / totalStudents) * 100) : 0;

  const trendData = useMemo(() => {
    return detail?.performanceTrend || [];
  }, [detail]);

  const alertStudents = students.filter((s) => s.engagementStatus === "Disengaged").slice(0, 8);
  const selectedStudentSummary = students.find((student) => student._id === selectedStudent) || null;

  function exportCsv() {
    if (!students.length) return;

    const header = ["name", "studentId", "attendance", "marks", "engagementStatus", "riskLevel", "confidenceScore"];
    const rows = students.map((student) =>
      [
        student.name,
        student.studentId,
        student.attendance,
        student.marks,
        student.engagementStatus,
        student.riskLevel,
        student.confidenceScore
      ].join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "edusense_teacher_report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingCsv(true);
    setImportMessage("📥 Processing...");

    try {
      const text = await file.text();
      console.log("File read successfully, length:", text.length);

      const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line);
      console.log("Lines parsed:", lines.length);

      if (lines.length < 2) {
        setImportMessage("❌ Need header + at least 1 row");
        setImportingCsv(false);
        return;
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log("Headers:", headers);

      let successCount = 0;
      let failCount = 0;

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(',').map(c => c.trim());
          
          // Map columns flexibly
          const name = cols[0] || cols[headers.indexOf('student_name')] || cols[headers.indexOf('name')] || '';
          const attendance = parseFloat(cols[headers.indexOf('attendance_percent')] ?? cols[headers.indexOf('attendance')] ?? 75) || 75;
          const marks = parseFloat(cols[headers.indexOf('avg_grade')] ?? cols[headers.indexOf('marks')] ?? 70) || 70;
          const feedback = cols[headers.indexOf('feedback_text')] || cols[headers.indexOf('feedback')] || '';

          if (!name) {
            failCount++;
            continue;
          }

          const res = await api.post('/students', {
            name: name.trim(),
            studentId: `STU${String(Date.now() + i).slice(-6)}`,
            attendance: Math.min(100, Math.max(0, attendance)),
            marks: Math.min(100, Math.max(0, marks)),
            course: 'General',
            feedbackText: feedback.slice(0, 100),
            behaviorRating: 3
          });

          console.log(`✓ Row ${i}: ${name}`);
          successCount++;
        } catch (err) {
          console.error(`✗ Row ${i}:`, err.message);
          failCount++;
        }
      }

      console.log("Import done:", successCount, "success,", failCount, "failed");
      setImportMessage(`✅ ${successCount} students added${failCount > 0 ? ` (${failCount} failed)` : ''}`);

      // Reload students
      const res = await api.get('/students');
      setStudents(res.data);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Import error:", error);
      setImportMessage(`❌ ${error.message}`);
    } finally {
      setImportingCsv(false);
    }
  }

  // Content for Overview Tab
  const overviewContent = (
    <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total Students" value={totalStudents} />
        <StatCard title="Engaged" value={`${engagedPct}%`} />
        <StatCard title="At Risk" value={`${atRiskPct}%`} />
        <StatCard title="Disengaged" value={`${disengagedPct}%`} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card card-hover p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Engagement Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-hover p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Risk Trend Snapshot</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={students.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="studentId" hide />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Area dataKey="confidenceScore" stroke="#2563eb" fill="#93c5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </>
  );

  // Content for Students Tab
  const studentsContent = (
    <section className="card card-hover p-5">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-semibold text-slate-700">All Students</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary gap-2" onClick={() => loadDashboardData()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button 
            className="btn-primary gap-2" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
          <div className="relative w-48 md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Search student (press Enter)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters();
                }
              }}
            />
          </div>
          <select className="input" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="At Risk">At Risk</option>
            <option value="Disengaged">Disengaged</option>
            <option value="Engaged">Engaged</option>
          </select>
          <button className="btn-primary" onClick={applyFilters}>Apply</button>
          <button className="btn-secondary" onClick={exportCsv}>Export CSV</button>
          <label className="btn-secondary cursor-pointer">
            Import CSV
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleCsvImport}
              disabled={importingCsv}
              onFocus={() => setImportMessage("")}
              style={{ display: "none" }}
            />
          </label>
          <button 
            className="btn-primary" 
            onClick={runPredictions}
            disabled={checkingDisengagement || students.length === 0}
          >
            {checkingDisengagement ? "⏳ Predicting..." : "🔮 Run Predictions"}
          </button>
          {importMessage && (
            <span className={`text-xs ${importMessage.includes("✅") ? "text-green-600" : "text-red-600"}`}>
              {importMessage}
            </span>
          )}
        </div>
      </div>

      {dashboardError ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{dashboardError}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Attendance</th>
              <th className="py-2">Marks</th>
              <th className="py-2">Engagement</th>
              <th className="py-2">Risk Level</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.length ? students.map((student) => (
              <tr
                key={student._id}
                className="border-b border-slate-100 transition hover:bg-brand-50/40"
              >
                <td 
                  className="py-2 cursor-pointer"
                  onClick={() => handleSelectStudent(student._id, "analytics")}
                >
                  {student.name}
                </td>
                <td className="py-2">{student.attendance}%</td>
                <td className="py-2">{student.marks}</td>
                <td className="py-2"><span className={statusPill(student.engagementStatus)}>{student.engagementStatus}</span></td>
                <td className="py-2">{student.riskLevel}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => handleSelectStudent(student._id, "analytics")}
                    >
                      View
                    </button>
                    <button
                      className="btn-primary text-xs gap-1 inline-flex items-center"
                      onClick={() => openMessageModal(student)}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="py-6 text-center text-sm text-slate-500">
                  No students matched your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  // Content for Analytics Tab
  const analyticsContent = (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
      <div className="card card-hover p-5 xl:col-span-3">
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Select Student
            </label>
            <select
              className="input w-full"
              value={selectedStudent || ""}
              onChange={(event) => handleSelectStudent(event.target.value, "analytics")}
              disabled={!students.length}
            >
              {students.length ? (
                students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.studentId})
                  </option>
                ))
              ) : (
                <option value="">No students available</option>
              )}
            </select>
          </div>

          {selectedStudentSummary ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{selectedStudentSummary.name}</p>
              <p>{selectedStudentSummary.engagementStatus} • {selectedStudentSummary.riskLevel}</p>
            </div>
          ) : null}
        </div>

        {students.length ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {students.slice(0, 8).map((student) => (
              <button
                key={student._id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedStudent === student._id
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
                onClick={() => handleSelectStudent(student._id, "analytics")}
              >
                {student.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Student Detail</h2>
          {detail && (
            <button
              className="btn-primary gap-2 text-xs"
              onClick={checkDisengagement}
              disabled={checkingDisengagement}
            >
              <CheckCircle className="h-4 w-4" />
              {checkingDisengagement ? "Checking..." : "Check Disengagement"}
            </button>
          )}
        </div>
        {loadingDetail ? (
          <Loader label="Loading student detail" />
        ) : !detail ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-600">
            Choose a student from the selector above to view their analytics and run disengagement checks.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-semibold text-slate-800">{detail.name} ({detail.studentId})</p>
              <p className="text-sm text-slate-600">{detail.course}</p>
            </div>

            {disengagementResult && (
              <div className={`rounded-xl border px-4 py-3 ${
                disengagementResult.status === "Engaged" 
                  ? "border-green-200 bg-green-50" 
                  : disengagementResult.status === "At Risk"
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50"
              }`}>
                <p className={`font-semibold ${
                  disengagementResult.status === "Engaged" 
                    ? "text-green-900" 
                    : disengagementResult.status === "At Risk"
                    ? "text-amber-900"
                    : "text-red-900"
                }`}>
                  Status: {disengagementResult.status}
                </p>
                <p className="text-sm text-slate-700">Confidence: {Math.round((disengagementResult.confidence || 0) * 100)}%</p>
                <p className="mt-2 text-sm text-slate-700"><strong>Reason:</strong> {disengagementResult.reason}</p>
                {disengagementResult.suggestions?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-700">Suggestions:</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                      {disengagementResult.suggestions.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Feedback History</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {(detail.feedbackHistory || []).slice(0, 4).map((item, idx) => (
                    <li key={`${item.createdAt}-${idx}`} className="rounded-lg bg-slate-50 px-3 py-2">{item.text}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Prediction Logs</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {(detail.predictionLogs || []).slice(0, 4).map((item, idx) => (
                    <li key={`${item.createdAt}-${idx}`} className="rounded-lg bg-slate-50 px-3 py-2">
                      {item.engagementStatus} ({Math.round((item.confidenceScore || 0) * 100)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="h-64 rounded-xl border border-slate-200 bg-white/80 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="term" />
                  <YAxis domain={[30, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="marks" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 xl:col-span-2">
        <div className="card card-hover p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Status Count</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );

  // Content for Alerts Tab
  const alertsContent = (
    <div className="space-y-5">
      <div className="card card-hover p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <h2 className="text-sm font-semibold text-slate-700">High Risk Students</h2>
        </div>
        <ul className="space-y-2 text-sm text-slate-700">
          {alertStudents.length ? (
            alertStudents.map((student) => (
              <li
                key={student._id}
                className="cursor-pointer rounded-lg bg-rose-50 px-3 py-2 transition hover:bg-rose-100"
                onClick={() => handleSelectStudent(student._id, "analytics")}
              >
                <p className="font-semibold">{student.name} ({student.studentId})</p>
                <p className="text-xs text-slate-600">Risk Score: {Math.round((student.confidenceScore || 0) * 100)}%</p>
              </li>
            ))
          ) : (
            <li className="rounded-lg bg-emerald-50 px-3 py-2">No high-risk alerts at the moment.</li>
          )}
        </ul>
      </div>

      <div className="card card-hover p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Alert Summary</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Disengaged</p>
            <p className="text-lg font-semibold text-slate-900">{analytics.disengaged}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">At Risk</p>
            <p className="text-lg font-semibold text-slate-900">{analytics.atRisk}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Engaged</p>
            <p className="text-lg font-semibold text-slate-900">{analytics.engaged}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
      <TeacherSidebar active={activeTab} onSelect={setActiveTab} onLogout={onLogout} />

      <main className="space-y-5">
        <header className="card card-hover p-5">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            {activeTab === "overview" && "Dashboard Overview"}
            {activeTab === "students" && "Student Management"}
            {activeTab === "analytics" && "Student Analytics"}
            {activeTab === "alerts" && "Alert Center"}
          </h1>
          <p className="text-sm text-slate-600">Welcome {user?.name}. Monitor student engagement and intervene early.</p>
        </header>

        {loading || !analytics ? (
          <Loader label="Loading dashboard" />
        ) : (
          <>
            {activeTab === "overview" && overviewContent}
            {activeTab === "students" && studentsContent}
            {activeTab === "analytics" && analyticsContent}
            {activeTab === "alerts" && alertsContent}
          </>
        )}
      </main>

      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onStudentAdded={handleStudentAdded}
      />

      {/* Message Modal */}
      {showMessageModal && messageStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <div className="card w-full max-w-md rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Send Message</h2>
              <button
                onClick={closeMessageModal}
                className="rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Sending message to <span className="font-semibold">{messageStudent.name}</span>
            </p>

            <textarea
              className="input w-full h-32 mb-4 resize-none"
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setMessageError("");
              }}
            />

            {messageError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{messageError}</p>
            )}

            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1"
                onClick={closeMessageModal}
                disabled={sendingMessage}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleSendMessage}
                disabled={sendingMessage}
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

