import { supabaseAdmin } from '../db/supabaseServer'

export async function listRecipes() {
  const { data, error } = await supabaseAdmin.from('recipes').select('id,title,default_servings,image_url,recipe_ingredients(*)')
  if (error) throw error
  return data
}

export async function getRecipe(id: string) {
  const { data, error } = await supabaseAdmin.from('recipes').select('id,title,default_servings,recipe_ingredients(*)').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getRecipeByTitle(title: string) {
  const { data, error } = await supabaseAdmin.from('recipes').select('id,title,default_servings').ilike('title', title).limit(1).single()
  if (error) throw error
  return data
}

export async function listAllIngredients(){
  const { data, error } = await supabaseAdmin.from('ingredients').select('*')
  if (error) throw error
  return data
}
