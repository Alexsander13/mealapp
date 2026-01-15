import { NextResponse } from 'next/server'
import { getPlan } from '@/lib/repos/plansRepo'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function GET(req: Request, { params }: any){
  const plan = await getPlan(params.planId)
  if (!plan) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Plan not found' })
  const { data: rows } = await supabaseAdmin.from('plan_rows').select('day_index,slot,recipe_id').eq('plan_id', params.planId).order('day_index', { ascending: true })
  return NextResponse.json({ ok: true, plan, rows })
}
