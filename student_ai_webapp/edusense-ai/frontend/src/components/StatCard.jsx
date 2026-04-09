import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, accent = "text-brand-600" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card card-hover relative overflow-hidden p-4"
    >
      <div className="absolute right-0 top-0 h-12 w-24 rounded-bl-[2rem] bg-gradient-to-br from-brand-100/80 to-cyan-100/50" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {Icon ? <Icon className={`h-7 w-7 drop-shadow-sm ${accent}`} /> : null}
      </div>
    </motion.div>
  );
}
