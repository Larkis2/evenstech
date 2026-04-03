import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { composeInvitation } from '@/lib/compose-invitation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { invitationCode } = await request.json()

    // Fetch invitation with guest and event data
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .select('*, guest:guests(*, event:events(*))')
      .eq('code', invitationCode)
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    const guest = invitation.guest
    const event = guest.event

    // Check if event has an AI-generated design image
    const designConfig = event.design_config
    const backgroundUrl = designConfig?.imageUrl

    if (!backgroundUrl) {
      return NextResponse.json({ error: 'Pas de design image pour cet événement' }, { status: 400 })
    }

    // Compose the invitation image with text overlay config
    const imageBuffer = await composeInvitation({
      backgroundUrl,
      guestName: `${guest.first_name} ${guest.last_name}`,
      tableSeat: guest.table_seat || undefined,
      invitationCode: invitation.code,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://invit.app',
      textOverlay: designConfig?.textOverlay || undefined,
      positions: designConfig?.positions || undefined,
    })

    // Upload to Supabase Storage
    const storagePath = `invitations/${event.id}/${invitation.code}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('design-imports')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('design-imports')
      .getPublicUrl(storagePath)

    return NextResponse.json({ imageUrl: publicUrl })
  } catch (error) {
    console.error('Compose invitation error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
