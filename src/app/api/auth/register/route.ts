import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { name, email, password } = await request.json()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm, pas besoin de vérifier l'email
    user_metadata: { full_name: name },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Create organization (avec service role, bypass RLS)
  const { error: orgError } = await supabaseAdmin.from('organizations').insert({
    user_id: authData.user.id,
    name: `Organisation de ${name}`,
  })

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
