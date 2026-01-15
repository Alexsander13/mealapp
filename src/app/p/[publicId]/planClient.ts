export async function createPlan(publicId:string, peopleCount:number, name?:string){
  const res = await fetch('/api/plans/create',{ method:'POST', body: JSON.stringify({ publicId, peopleCount, name }), headers: { 'content-type':'application/json' } })
  if (!res.ok) {
    const text = await res.text()
    console.error('Failed to create plan:', res.status, text)
    try {
      return JSON.parse(text)
    } catch {
      return { ok: false, code: 'INTERNAL', message: 'Server error' }
    }
  }
  return res.json()
}
export async function loadPlans(publicId:string){
  const res = await fetch(`/api/plans?publicId=${publicId}`)
  return res.json()
}
export async function loadPlan(planId:string){
  const res = await fetch(`/api/plans/${planId}`)
  return res.json()
}
export async function replaceMeal(planId:string, body:any){
  const res = await fetch(`/api/plans/replace/${planId}`,{ method:'POST', body: JSON.stringify(body), headers: { 'content-type':'application/json' } })
  return res.json()
}
export async function finalize(planId:string){
  const res = await fetch(`/api/plans/finalize/${planId}`,{ method:'POST' })
  return res.json()
}
export async function getShopping(shoppingId:string){
  const res = await fetch(`/api/shopping-lists/${shoppingId}`)
  return res.json()
}
