import { X } from "lucide-react";
import { useState } from "react";
import api from "../api/client";

export default function AddStudentModal({ isOpen, onClose, onStudentAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    course: "",
    attendance: "75",
    marks: "70",
    behaviorRating: "3",
    feedbackText: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        studentId: formData.studentId.trim().toUpperCase(),
        course: formData.course.trim() || "General",
        attendance: Number(formData.attendance),
        marks: Number(formData.marks),
        behaviorRating: Number(formData.behaviorRating),
        feedbackText: formData.feedbackText.trim()
      };

      if (!payload.name || !payload.studentId) {
        setError("Name and Student ID are required");
        setLoading(false);
        return;
      }

      const response = await api.post("/students", payload);
      setFormData({
        name: "",
        studentId: "",
        course: "",
        attendance: "75",
        marks: "70",
        behaviorRating: "3",
        feedbackText: ""
      });
      onStudentAdded(response.data.student);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card max-h-screen w-full max-w-md overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Add New Student
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name *</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="Student name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Student ID *</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="e.g., EDU0101"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Course</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="Course name"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Attendance %</label>
              <input
                type="number"
                className="input mt-1"
                placeholder="0-100"
                min="0"
                max="100"
                value={formData.attendance}
                onChange={(e) => setFormData({ ...formData, attendance: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Marks</label>
              <input
                type="number"
                className="input mt-1"
                placeholder="0-100"
                min="0"
                max="100"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Behavior (1-5)</label>
              <input
                type="number"
                className="input mt-1"
                placeholder="1-5"
                min="1"
                max="5"
                value={formData.behaviorRating}
                onChange={(e) => setFormData({ ...formData, behaviorRating: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Feedback</label>
            <textarea
              className="input mt-1 resize-none"
              placeholder="Initial feedback (optional)"
              rows="3"
              value={formData.feedbackText}
              onChange={(e) => setFormData({ ...formData, feedbackText: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Creating..." : "Create Student"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
