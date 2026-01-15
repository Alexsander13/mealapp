import { hashSeed } from '../utils/hashSeed'
import { listRecipes } from '../repos/recipesRepo'
import { createPlan, addPlanRow } from '../repos/plansRepo'

const slots = ['breakfast','lunch','dinner','snack'] as const
const slotCandidates: Record<string,string[]> = {
  breakfast: ['Oatmeal with Banana','Scrambled Eggs on Toast','Greek Yogurt Bowl','Avocado Toast','Pancakes','Cheese Omelette','Peanut Butter Banana Smoothie'],
  snack: ['Greek Yogurt Bowl','Avocado Toast','Peanut Butter Banana Smoothie','Oatmeal with Banana','Scrambled Eggs on Toast'],
  lunch: ['Chicken Rice Bowl','Beef Stew','Salmon Lemon Pasta','Chicken Stir-Fry','Spaghetti Bolognese','Shrimp Tacos','Caesar Salad with Chicken','Fried Rice','Baked Salmon with Veggies','Chicken Quesadilla','Thai Curry','Beef Tacos','Tuna Salad','Chicken Teriyaki','Veggie Pasta'],
  dinner: ['Chicken Rice Bowl','Beef Stew','Salmon Lemon Pasta','Chicken Stir-Fry','Spaghetti Bolognese','Shrimp Tacos','Caesar Salad with Chicken','Fried Rice','Baked Salmon with Veggies','Chicken Quesadilla','Thai Curry','Beef Tacos','Tuna Salad','Chicken Teriyaki','Veggie Pasta']
}

function seededShuffle<T>(arr:T[], seed:number){
  const a = [...arr]
  for(let i=a.length-1;i>0;i--){
    const j = seed % (i+1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
    seed = Math.floor(seed/ (i+1))
  }
  return a
}

export async function generatePlan(publicId: string, profileId: string, peopleCount: number, name?: string){
  const plan = await createPlan(profileId, peopleCount, name)
  const recipes = await listRecipes()
  const titleToId = new Map(recipes.map((r:any)=>[r.title,r.id]))

  for(let day=0; day<7; day++){
    for(const slot of slots){
      const candidates = slotCandidates[slot]
      const seed = hashSeed(publicId + plan.id + slot)
      const shuffled = seededShuffle(candidates, seed)
      const pickTitle = shuffled[day % shuffled.length]
      const recipeId = titleToId.get(pickTitle)
      if (!recipeId) throw new Error('Recipe missing: '+pickTitle)
      await addPlanRow(plan.id, day, slot, recipeId)
    }
  }
  return plan
}
