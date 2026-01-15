import { supabaseAdmin } from '../db/supabaseServer'

export async function findOrCreateProfile(publicId: string, name: string) {
  const { data, error } = await supabaseAdmin.from('profiles').upsert({ public_id: publicId, name }, { onConflict: ['public_id'] }).select().limit(1)
  if (error) throw error
  return data![0]
}

export async function findProfileByPublicId(publicId: string){
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('public_id', publicId).limit(1).single()
  if (error) return null
  return data
}

export async function findProfileByName(name: string){
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('name', name).limit(1).single()
  if (error) return null
  return data
}
