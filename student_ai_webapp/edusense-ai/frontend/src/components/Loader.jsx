export default function Loader({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-gradient-to-r from-white to-brand-50 px-4 py-3 text-slate-700">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-r-transparent border-t-transparent" />
      <span className="text-sm font-medium">{label}...</span>
    </div>
  );
}
