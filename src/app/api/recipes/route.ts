import { NextResponse } from 'next/server'
import { listRecipes } from '@/lib/repos/recipesRepo'
import { supabaseAdmin } from '@/lib/db/supabaseServer'

export async function GET(req: Request){
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')
  
  // Если запрашиваются конкретные рецепты по ID
  if (ids) {
    const idArray = ids.split(',').map(id => parseInt(id))
    const { data, error } = await supabaseAdmin
      .from('v2_recipes')
      .select('id,name,base_servings,image_url,url')
      .in('id', idArray)
    
    if (error) throw error
    
    const recipes = data.map((r: any) => ({ 
      id: String(r.id), 
      title: r.name, 
      name: r.name,
      default_servings: r.base_servings,
      image_url: r.image_url,
      url: r.url
    }))
    
    return NextResponse.json({ ok: true, data: recipes })
  }
  
  // Иначе возвращаем первые 1000 для списка
  const data = await listRecipes()
  return NextResponse.json({ ok: true, data })
}
