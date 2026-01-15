import { NextResponse } from 'next/server'
import { profileInitSchema } from '@/lib/validation/schemas'
import { validationError } from '@/lib/validation/errors'
import { findOrCreateProfile, findProfileByName } from '@/lib/repos/usersRepo'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request){
  const body = await req.json()
  const parsed = profileInitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json(validationError('Invalid body', parsed.error.format()))
  
  // Check if profile with this name already exists
  const existing = await findProfileByName(parsed.data.name)
  if (existing) {
    return NextResponse.json({ ok: true, publicId: existing.public_id, name: existing.name })
  }
  
  // Create new profile
  const publicId = uuidv4().slice(0,8)
  const profile = await findOrCreateProfile(publicId, parsed.data.name)
  return NextResponse.json({ ok: true, publicId: profile.public_id, name: profile.name })
}
