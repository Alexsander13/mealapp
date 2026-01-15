import { supabaseAdmin } from '../db/supabaseServer'

export async function createPlan(profileId: string, peopleCount: number, name?: string) {
  const { data, error } = await supabaseAdmin.from('plans').insert({ profile_id: profileId, people_count: peopleCount, name }).select().single()
  if (error) throw error
  return data
}

export async function addPlanRow(planId: string, dayIndex: number, slot: string, recipeId: string) {
  const { data, error } = await supabaseAdmin.from('plan_rows').insert({ plan_id: planId, day_index: dayIndex, slot, recipe_id: recipeId }).select().single()
  if (error) throw error
  return data
}

export async function listPlanRows(planId: string){
  const { data, error } = await supabaseAdmin.from('plan_rows').select('*').eq('plan_id', planId).order('day_index', { ascending: true })
  if (error) throw error
  return data
}

export async function getPlan(planId: string){
  const { data, error } = await supabaseAdmin.from('plans').select('*').eq('id', planId).single()
  if (error) throw error
  return data
}

export async function replacePlanRow(planId: string, dayIndex: number, slot: string, recipeId: string){
  const { data, error } = await supabaseAdmin.from('plan_rows').upsert({ plan_id: planId, day_index: dayIndex, slot, recipe_id: recipeId }, { onConflict: ['plan_id','day_index','slot'] }).select()
  if (error) throw error
  return data
}
