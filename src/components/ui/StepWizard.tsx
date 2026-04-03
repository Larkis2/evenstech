'use client'

interface StepWizardProps {
  steps: string[]
  currentStep: number
}

export default function StepWizard({ steps, currentStep }: StepWizardProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
              index <= currentStep
                ? 'bg-[var(--violet)] text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {index + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              index <= currentStep ? 'text-[var(--text-title)] font-medium' : 'text-gray-400'
            }`}
          >
            {step}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                index < currentStep ? 'bg-[var(--violet)]' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
