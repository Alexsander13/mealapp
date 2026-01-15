import { NextResponse } from 'next/server'
import { plansRenameSchema } from '@/lib/validation/schemas'
import { validationError, notFound } from '@/lib/validation/errors'
import { getPlan } from '@/lib/repos/plansRepo'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function POST(req: Request, { params }: any){
  const body = await req.json()
  const parsed = plansRenameSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json(validationError('Invalid body', parsed.error.format()))
  const plan = await getPlan(params.planId)
  if (!plan) return NextResponse.json(notFound('Plan not found'))
  const { error } = await supabaseAdmin.from('plans').update({ name: parsed.data.name }).eq('id', params.planId)
  if (error) return NextResponse.json({ ok: false, code: 'INTERNAL', message: error.message })
  return NextResponse.json({ ok: true })
}
