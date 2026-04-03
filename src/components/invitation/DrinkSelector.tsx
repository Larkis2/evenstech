'use client'

import { BOISSONS_ALCOOLISEES_DEFAULT, BOISSONS_NON_ALCOOLISEES_DEFAULT } from '@/lib/drinks'

interface DrinkSelectorProps {
  selectedAlcool: string[]
  selectedSoft: string[]
  onChangeAlcool: (drinks: string[]) => void
  onChangeSoft: (drinks: string[]) => void
  alcoholOptions?: string[]
  softOptions?: string[]
}

export default function DrinkSelector({
  selectedAlcool,
  selectedSoft,
  onChangeAlcool,
  onChangeSoft,
  alcoholOptions,
  softOptions,
}: DrinkSelectorProps) {
  const alcoolList = alcoholOptions && alcoholOptions.length > 0 ? alcoholOptions : BOISSONS_ALCOOLISEES_DEFAULT
  const softList = softOptions && softOptions.length > 0 ? softOptions : BOISSONS_NON_ALCOOLISEES_DEFAULT

  function toggleAlcool(drink: string) {
    if (selectedAlcool.includes(drink)) {
      onChangeAlcool([])
    } else {
      onChangeAlcool([drink])
    }
  }

  function toggleSoft(drink: string) {
    if (selectedSoft.includes(drink)) {
      onChangeSoft([])
    } else {
      onChangeSoft([drink])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-title)] mb-3">
        Vos préférences pour la soirée
      </label>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Boissons alcoolisées (max 1)</p>
        <div className="flex flex-wrap gap-2">
          {alcoolList.map((drink) => (
            <button
              key={drink}
              type="button"
              onClick={() => toggleAlcool(drink)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedAlcool.includes(drink)
                  ? 'bg-[var(--violet)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {drink}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Boissons non alcoolisées (max 1)</p>
        <div className="flex flex-wrap gap-2">
          {softList.map((drink) => (
            <button
              key={drink}
              type="button"
              onClick={() => toggleSoft(drink)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSoft.includes(drink)
                  ? 'bg-[var(--violet)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {drink}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
