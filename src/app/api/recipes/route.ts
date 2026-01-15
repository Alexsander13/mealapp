import { NextResponse } from 'next/server'
import { listRecipes } from '@/lib/repos/recipesRepo'

export async function GET(){
  const data = await listRecipes()
  return NextResponse.json({ ok: true, data })
}
