"use client"
import React, { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SectionTitle from '@/components/ui/SectionTitle'
import { createPlan, loadPlans, loadPlan, finalize, getShopping } from './planClient'

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_ICONS: any = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎'
}

export default function PublicPage({ params }: any){
  const { publicId } = params
  const [name, setName] = useState('')
  const [stored, setStored] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [people, setPeople] = useState(2)
  const [menuName, setMenuName] = useState('')
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [planRows, setPlanRows] = useState<any[]>([])
  const [recipes, setRecipes] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    const p = localStorage.getItem('mealapp.publicId')
    const n = localStorage.getItem('mealapp.name')
    if (p) setStored(p)
    if (n) setName(n)
    loadPlans(publicId).then((j:any)=>{ if (j.ok) setPlans(j.data) })
    // Load all recipes on mount
    fetch('/api/recipes')
      .then(res => res.json())
      .then((j: any) => {
        if (j.ok && j.data) {
          const recipeMap = new Map()
          j.data.forEach((r: any) => recipeMap.set(String(r.id), r))
          setRecipes(recipeMap)
        }
      })
      .catch(e => console.error('Failed to load recipes:', e))
  },[])

  const loadPlanAndRows = async (plan: any) => {
    setLoading(true)
    setCurrentPlan(plan)
    const j = await loadPlan(plan.id)
    if (j.ok && j.rows) {
      console.log('📋 Plan rows loaded:', j.rows.length)
      setPlanRows(j.rows)
      
      // Загружаем только нужные рецепты по ID
      const recipeIds = [...new Set(j.rows.map((r: any) => r.recipe_id))]
      console.log('📥 Loading recipes:', recipeIds.length)
      
      const response = await fetch('/api/recipes?ids=' + recipeIds.join(','))
      const recipesData = await response.json()
      
      if (recipesData.ok && recipesData.data) {
        const recipeMap = new Map(recipes)
        recipesData.data.forEach((r: any) => {
          recipeMap.set(String(r.id), r)
        })
        setRecipes(recipeMap)
        console.log('✅ Recipes loaded and added to map')
      }
    }
    setLoading(false)
  }

  if (stored && stored !== publicId){
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Profile Detected</h2>
              <p className="text-gray-600 mb-6">
                This page is for <strong className="text-gray-900">{publicId}</strong> but you have <strong className="text-gray-900">{stored}</strong> stored locally.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={()=>{ 
                    localStorage.setItem('mealapp.publicId', publicId)
                    localStorage.setItem('mealapp.name', name || '')
                    window.location.reload()
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Use This Profile
                </Button>
                <Button 
                  onClick={()=>{ window.location.href = `/p/${stored}` }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  Back to My Profile
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {name ? `${name}'s` : 'Your'} Meal Planner
              </h1>
              <p className="text-sm text-gray-500 mt-1">ID: {publicId}</p>
            </div>
            <a 
              href="/" 
              className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Create Plan Card */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🍽️</span>
                Create New Plan
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of People
                  </label>
                  <Select 
                    value={people} 
                    onChange={(e:any)=>setPeople(Number(e.target.value))}
                    className="w-full"
                  >
                    {[1,2,3,4,5,6].map(n=> <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Name (optional)
                  </label>
                  <Input 
                    value={menuName} 
                    onChange={(e:any)=>setMenuName(e.target.value)}
                    placeholder="e.g. Week 1, January..."
                    className="w-full"
                  />
                </div>
                
                <Button 
                  onClick={async ()=>{
                    setLoading(true)
                    const j = await createPlan(publicId, people, menuName)
                    if (j.ok) { 
                      await loadPlanAndRows(j.plan)
                      setPlans([j.plan, ...plans]) 
                    } else {
                      alert('Error creating plan')
                    }
                    setLoading(false)
                  }}
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : '✨ Generate Meal Plan'}
                </Button>
              </div>
            </div>
          </Card>
          
          {/* History Card */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Your Plans
              </h2>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {plans.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No plans yet. Create your first meal plan!
                  </p>
                ) : (
                  plans.map(p=> (
                    <div 
                      key={p.id}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      onClick={async ()=>{ await loadPlanAndRows(p) }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {p.name || 'Unnamed Plan'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(p.created_at).toLocaleDateString()} • {p.people_count} {p.people_count === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                      <Button 
                        onClick={async (e: any)=>{ 
                          e.stopPropagation()
                          await loadPlanAndRows(p) 
                        }}
                        className="bg-primary-100 hover:bg-primary-200 text-primary-700 font-medium px-4 py-2 rounded-lg text-sm"
                      >
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
        {/* Current Plan View */}
        {currentPlan && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentPlan.name || 'Your Meal Plan'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    For {currentPlan.people_count} {currentPlan.people_count === 1 ? 'person' : 'people'}
                  </p>
                </div>
                <Button 
                  onClick={async ()=>{
                    const j = await finalize(currentPlan.id)
                    if (j.ok) { 
                      const s = await getShopping(j.shoppingListId)
                      console.log('Shopping List:', s)
                      alert('Shopping list finalized! Check console for details.')
                    }
                  }}
                  className="bg-accent-600 hover:bg-accent-700 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Generate Shopping List
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading meal plan...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(7)].map((_,day)=> (
                    <div key={day} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                        <div className="text-2xl">📅</div>
                        <div>
                          <div className="font-bold text-gray-900">Day {day+1}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(Date.now() + day * 86400000).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {SLOTS.map(slot => {
                          const row = planRows.find(r => r.day_index === day && r.slot === slot)
                          // Конвертируем recipe_id в строку для поиска в Map
                          const recipe = row ? recipes.get(String(row.recipe_id)) : null
                          return (
                            <div key={slot} className="group">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{SLOT_ICONS[slot]}</span>
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {slot}
                                </span>
                              </div>
                              {recipe ? (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-primary-300 transition-colors">
                                  {recipe.image_url && (
                                    <img 
                                      src={recipe.image_url} 
                                      alt={recipe.title}
                                      className="w-full h-32 object-cover"
                                    />
                                  )}
                                  <div className="p-3">
                                    <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                      {recipe.title}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-100 rounded-lg p-3 text-center">
                                  <span className="text-xs text-gray-400">No meal</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
