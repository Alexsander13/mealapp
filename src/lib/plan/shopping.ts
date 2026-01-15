import { supabaseAdmin } from '../db/supabaseServer'

const tagPriority = ['main','sauce','spice','other']

export async function buildShoppingList(planId: string){
  // aggregate recipe_ingredients for plan rows
  const { data: rows } = await supabaseAdmin.from('plan_rows').select('recipe_id,day_index,slot').eq('plan_id', planId)
  const recipeIds = Array.from(new Set(rows!.map((r:any)=>r.recipe_id)))
  const { data: ingredients } = await supabaseAdmin.from('recipe_ingredients').select('ingredient_id,amount_g,unit,category,recipes(id)').in('recipe_id', recipeIds)

  // sum amounts grouped by ingredient
  const map = new Map<string,{amount:number,unit:string,category:string}>()
  for(const ing of ingredients!){
    const id = ing.ingredient_id
    const existing = map.get(id)
    if (existing) existing.amount += ing.amount_g
    else map.set(id,{amount:ing.amount_g,unit:ing.unit,category:ing.category})
  }

  // transform and group by tag priority using ingredient tags
  const ingredientIds = Array.from(map.keys())
  const { data: ingrData } = await supabaseAdmin.from('ingredients').select('id,name,tags').in('id', ingredientIds)

  const grouped: Record<string,Array<any>> = { main:[], sauce:[], spice:[], other:[] }
  for(const i of ingrData!){
    const info = map.get(i.id)!
    const tags = i.tags || []
    let placed = false
    const item = { id: i.id, name: i.name, amount: info.amount, unit: info.unit, tags }
    for(const p of tagPriority){
      if (tags.includes(p)) { grouped[p].push(item); placed = true; break }
    }
    if (!placed) grouped.other.push(item)
  }

  return grouped
} 
