import { NextResponse } from 'next/server'
import { plansReplaceSchema } from '@/lib/validation/schemas'
import { validationError, notFound } from '@/lib/validation/errors'
import { replacePlanRow, getPlan } from '@/lib/repos/plansRepo'

export async function POST(req: Request, { params }: any){
  const body = await req.json()
  const parsed = plansReplaceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json(validationError('Invalid body', parsed.error.format()))
  const plan = await getPlan(params.planId)
  if (!plan) return NextResponse.json(notFound('Plan not found'))
  await replacePlanRow(params.planId, parsed.data.dayIndex, parsed.data.slot, parsed.data.newRecipeId)
  return NextResponse.json({ ok: true })
}
