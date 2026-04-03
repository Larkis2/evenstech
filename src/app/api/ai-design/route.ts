import OpenAI from 'openai'

function buildInvitationPrompt(description: string, eventType: string, styleSuffix: string): string {
  return `Professional ${eventType || 'event'} invitation card design. ${description}. High quality graphic design, beautiful typography, elegant layout with space for couple names and event details. Professional invitation poster style. No readable text on the image - just the beautiful background design with ornamental elements. Print-ready quality, portrait orientation. ${styleSuffix}`.trim()
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { description, eventType, isRefinement, currentDesign, refineFeedback } = await request.json()

    // Refinement: single image with adjusted prompt
    if (isRefinement && currentDesign?.dallePrompt) {
      const refinedPrompt = `${currentDesign.dallePrompt}. Adjustment: ${refineFeedback || description}`
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: refinedPrompt,
        n: 1,
        size: '1024x1792',
        style: 'natural',
        response_format: 'url',
      })

      return Response.json({
        proposals: [{
          imageUrl: imageResponse.data?.[0]?.url ?? null,
          label: currentDesign.label || 'Ajusté',
          dallePrompt: refinedPrompt,
          revisedPrompt: imageResponse.data?.[0]?.revised_prompt,
        }],
      })
    }

    // Generate 3 images in parallel with different styles
    const styles = [
      { suffix: 'Style: elegant, sophisticated, dark tones with gold accents, luxurious textures.', label: 'Élégant & Sobre' },
      { suffix: 'Style: festive, colorful, vibrant African wax patterns, warm rich colors.', label: 'Festif & Coloré' },
      { suffix: 'Style: modern, minimalist, clean lines, contemporary design, subtle textures.', label: 'Moderne & Minimaliste' },
    ]

    const results = await Promise.all(
      styles.map(async ({ suffix, label }) => {
        try {
          const prompt = buildInvitationPrompt(description, eventType || '', suffix)
          const imageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1792',
            quality: 'standard',
            style: 'natural',
            response_format: 'url',
          })

          return {
            imageUrl: imageResponse.data?.[0]?.url ?? null,
            label,
            dallePrompt: prompt,
            revisedPrompt: imageResponse.data?.[0]?.revised_prompt,
          }
        } catch (dalleError) {
          console.error('DALL-E error for', label, ':', dalleError)
          return {
            imageUrl: null,
            label,
            dallePrompt: '',
            error: String(dalleError),
          }
        }
      })
    )

    return Response.json({ proposals: results })
  } catch (error) {
    console.error('AI Design error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
