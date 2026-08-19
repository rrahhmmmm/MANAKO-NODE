export type Stats = { running: number; completed: number; inisiasi: number; cancelled: number };

export function StatsCards({ data }: { data: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Running" value={data.running} color="bg-emerald-50 text-emerald-700" />
      <StatCard label="Inisiasi" value={data.inisiasi} color="bg-amber-50 text-amber-700" />
      <StatCard label="Completed" value={data.completed} color="bg-blue-50 text-blue-700" />
      <StatCard label="Cancelled" value={data.cancelled} color="bg-rose-50 text-rose-700" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-sm">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}
