import { NextResponse } from 'next/server'
import { plansCreateSchema } from '@/lib/validation/schemas'
import { validationError, notFound } from '@/lib/validation/errors'
import { findProfileByPublicId } from '@/lib/repos/usersRepo'
import { generatePlan } from '@/lib/plan/generator'

export async function POST(req: Request){
  try {
    const body = await req.json()
    const parsed = plansCreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json(validationError('Invalid body', parsed.error.format()))
    const profile = await findProfileByPublicId(parsed.data.publicId)
    if (!profile) return NextResponse.json(notFound('Profile not found'))
    const plan = await generatePlan(parsed.data.publicId, profile.id, parsed.data.peopleCount, parsed.data.name)
    return NextResponse.json({ ok: true, plan })
  } catch (error: any) {
    console.error('Error creating plan:', error)
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: error.message || 'Failed to create plan' }, { status: 500 })
  }
}
