import type { Ceremony } from '@/types'

interface CeremoniesTimelineProps {
  ceremonies: Ceremony[]
  accentColor: string
}

export default function CeremoniesTimeline({
  ceremonies,
  accentColor,
}: CeremoniesTimelineProps) {
  return (
    <div>
      <h3
        className="text-sm font-semibold mb-4 text-center"
        style={{ color: accentColor }}
      >
        Programme des cérémonies
      </h3>
      <div className="space-y-3">
        {ceremonies.map((ceremony, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white rounded-xl"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{ceremony.name}</p>
              <p className="text-xs text-gray-500">
                {ceremony.date &&
                  new Date(ceremony.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                {ceremony.time && ` à ${ceremony.time}`}
                {ceremony.location && ` — ${ceremony.location}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
