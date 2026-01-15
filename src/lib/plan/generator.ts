import { hashSeed } from '../utils/hashSeed'
import { listRecipes } from '../repos/recipesRepo'
import { createPlan, addPlanRow } from '../repos/plansRepo'

const slots = ['breakfast','lunch','dinner','snack'] as const

function seededShuffle<T>(arr:T[], seed:number){
  const a = [...arr]
  let currentSeed = seed
  for(let i=a.length-1;i>0;i--){
    // Используем более качественный генератор случайных чисел
    currentSeed = (currentSeed * 9301 + 49297) % 233280
    const j = Math.floor((currentSeed / 233280) * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// Выбираем рецепты для слотов на основе их ID (просто берём разные диапазоны)
function getRecipesForSlot(allRecipes: any[], slot: string) {
  // Для завтрака и снеков - первая четверть
  if (slot === 'breakfast') {
    return allRecipes.slice(0, Math.floor(allRecipes.length / 4))
  }
  if (slot === 'snack') {
    return allRecipes.slice(0, Math.floor(allRecipes.length / 3))
  }
  // Для обеда и ужина - вся база
  return allRecipes
}

export async function generatePlan(publicId: string, profileId: string, peopleCount: number, name?: string){
  const plan = await createPlan(profileId, peopleCount, name)
  const allRecipes = await listRecipes()
  
  if (allRecipes.length === 0) {
    throw new Error('No recipes available in database')
  }

  const usedBreakfasts = new Set<string>()
  const usedSnacks = new Set<string>()
  let previousDayLunchId: string | null = null
  let previousDayDinnerId: string | null = null

  for(let day=0; day<7; day++){
    const usedToday = new Set<string>()
    let todayLunchId: string | null = null
    let todayDinnerId: string | null = null
    
    for(const slot of slots){
      const candidates = getRecipesForSlot(allRecipes, slot)
      const seed = hashSeed(publicId + plan.id + slot + day)
      let shuffled = seededShuffle(candidates, seed)
      
      // Фильтруем по правилам
      let recipe = shuffled.find(r => {
        const id = String(r.id)
        
        // В пределах дня - все блюда должны быть разными
        if (usedToday.has(id)) return false
        
        // Завтрак всегда уникальный
        if (slot === 'breakfast' && usedBreakfasts.has(id)) return false
        
        // Перекус всегда уникальный
        if (slot === 'snack' && usedSnacks.has(id)) return false
        
        // Для обеда и ужина - можно повторяться между днями, но не оба сразу
        if (day > 0) {
          // Если обед повторяется с предыдущим днем, то ужин не должен повторяться
          if (slot === 'lunch' && id === previousDayLunchId && todayDinnerId === previousDayDinnerId) {
            return false
          }
          // Если ужин повторяется с предыдущим днем, то обед не должен повторяться
          if (slot === 'dinner' && id === previousDayDinnerId && todayLunchId === previousDayLunchId) {
            return false
          }
        }
        
        return true
      })
      
      // Если не нашли подходящий - берем первый из отфильтрованных по дню
      if (!recipe) {
        recipe = shuffled.find(r => !usedToday.has(String(r.id)))
      }
      
      // Если все еще нет - берем просто первый
      if (!recipe) {
        recipe = shuffled[0]
      }
      
      const recipeId = String(recipe.id)
      usedToday.add(recipeId)
      
      if (slot === 'breakfast') usedBreakfasts.add(recipeId)
      if (slot === 'snack') usedSnacks.add(recipeId)
      if (slot === 'lunch') todayLunchId = recipeId
      if (slot === 'dinner') todayDinnerId = recipeId
      
      await addPlanRow(plan.id, day, slot, recipeId)
    }
    
    // Сохраняем обед и ужин этого дня для проверки на следующий день
    previousDayLunchId = todayLunchId
    previousDayDinnerId = todayDinnerId
  }
  return plan
}

