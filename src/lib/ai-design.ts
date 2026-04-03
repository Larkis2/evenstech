export interface AIDesignProposal {
  imageUrl: string | null
  label: string
  dallePrompt: string
  revisedPrompt?: string
  error?: string
}

export async function generateDesignProposals(
  userDescription: string,
  eventType?: string
): Promise<AIDesignProposal[]> {
  const response = await fetch('/api/ai-design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: userDescription, eventType }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Erreur lors de la génération du design')
  }

  const data = await response.json()
  return data.proposals
}

export async function refineDesign(
  currentDesign: AIDesignProposal,
  feedback: string
): Promise<AIDesignProposal> {
  const response = await fetch('/api/ai-design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: feedback,
      refineFeedback: feedback,
      currentDesign,
      isRefinement: true,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Erreur lors de l'ajustement du design")
  }

  const data = await response.json()
  return data.proposals[0]
}
