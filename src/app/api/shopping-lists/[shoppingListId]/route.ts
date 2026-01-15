import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function GET(req: Request, { params }: any){
  const { data: items } = await supabaseAdmin.from('shopping_items').select('*').eq('shopping_list_id', params.shoppingListId)
  return NextResponse.json({ ok: true, items })
}
