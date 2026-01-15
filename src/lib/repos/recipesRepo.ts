import { supabaseAdmin } from '../db/supabaseServer'

export async function listRecipes() {
  // Берем случайные 5000 рецептов для разнообразия
  const { data, error } = await supabaseAdmin
    .from('v2_recipes')
    .select('id,name,base_servings,image_url,url')
    .limit(5000)
  if (error) throw error
  return data.map((r: any) => ({ 
    id: String(r.id), 
    title: r.name, 
    name: r.name,
    default_servings: r.base_servings,
    image_url: r.image_url,
    url: r.url
  }))
}

export async function getRecipe(id: string) {
  const { data, error } = await supabaseAdmin.from('v2_recipes').select('id,name,base_servings,image_url,url').eq('id', id).single()
  if (error) throw error
  return { 
    id: String(data.id),
    title: data.name, 
    name: data.name,
    default_servings: data.base_servings,
    image_url: data.image_url,
    url: data.url
  }
}

export async function getRecipeByTitle(title: string) {
  const { data, error } = await supabaseAdmin.from('v2_recipes').select('id,name,base_servings').ilike('name', title).limit(1).single()
  if (error) throw error
  return { ...data, title: data.name, default_servings: data.base_servings }
}

export async function listAllIngredients(){
  const { data, error } = await supabaseAdmin.from('v2_ingredients').select('*')
  if (error) throw error
  return data
}
