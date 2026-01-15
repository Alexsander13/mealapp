import { NextResponse } from 'next/server'
import { profileLoadSchema } from '@/lib/validation/schemas'
import { validationError, notFound } from '@/lib/validation/errors'
import { findProfileByPublicId } from '@/lib/repos/usersRepo'

export async function POST(req: Request){
  const body = await req.json()
  const parsed = profileLoadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json(validationError('Invalid body', parsed.error.format()))
  const p = await findProfileByPublicId(parsed.data.publicId)
  if (!p) return NextResponse.json(notFound('Profile not found'))
  return NextResponse.json({ ok: true, publicId: p.public_id, name: p.name })
}
