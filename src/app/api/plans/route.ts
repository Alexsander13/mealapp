import { NextResponse } from 'next/server'
import { findProfileByPublicId } from '@/lib/repos/usersRepo'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function GET(req: Request){
  const url = new URL(req.url)
  const publicId = url.searchParams.get('publicId')
  if (!publicId) return NextResponse.json({ ok: false, code: 'VALIDATION_ERROR', message: 'publicId required' })
  const profile = await findProfileByPublicId(publicId)
  if (!profile) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Profile not found' })
  const { data } = await supabaseAdmin.from('plans').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
  return NextResponse.json({ ok: true, data })
}
