interface Stat {
  label: string
  value: number
  color: string
}

export default function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl p-4 border border-gray-100"
        >
          <p className="text-2xl font-bold" style={{ color: stat.color }}>
            {stat.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
