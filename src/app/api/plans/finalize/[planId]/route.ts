import { NextResponse } from 'next/server'
import { getPlan } from '@/lib/repos/plansRepo'
import { buildShoppingList } from '@/lib/plan/shopping'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function POST(req: Request, { params }: any){
  const plan = await getPlan(params.planId)
  if (!plan) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Plan not found' })
  // create shopping list
  const { data, error } = await supabaseAdmin.from('shopping_lists').insert({ plan_id: params.planId }).select().single()
  if (error) return NextResponse.json({ ok: false, code: 'INTERNAL', message: error.message })
  const grouped = await buildShoppingList(params.planId)
  // insert items
  for(const g of Object.values(grouped)){
    for(const item of g){
      await supabaseAdmin.from('shopping_items').insert({ shopping_list_id: data.id, ingredient_id: item.id, amount_g: item.amount, unit: item.unit })
    }
  }
  return NextResponse.json({ ok: true, shoppingListId: data.id })
}
