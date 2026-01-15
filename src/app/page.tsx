"use client"
import React, { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function Home() {
  const [name, setName] = useState('')
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-2xl mb-6 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Plan Your Meals,
            <span className="text-primary-600"> Simplify Your Life</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Create personalized weekly meal plans in seconds. Get automatic shopping lists and never wonder "what's for dinner?" again.
          </p>

          {/* Profile Creation Card */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-soft p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get Started</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  What's your name?
                </label>
                <Input 
                  value={name} 
                  onChange={(e:any)=>setName(e.target.value)} 
                  placeholder="Enter your name" 
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={async ()=>{
                  if (!name.trim()) {
                    alert('Please enter your name')
                    return
                  }
                  const res = await fetch('/api/profile/init',{ 
                    method: 'POST', 
                    body: JSON.stringify({ name }), 
                    headers: { 'content-type':'application/json' } 
                  })
                  const j = await res.json()
                  if (j.ok) { 
                    localStorage.setItem('mealapp.publicId', j.publicId)
                    localStorage.setItem('mealapp.name', j.name)
                    window.location.href=`/p/${j.publicId}` 
                  }
                  else alert('Error creating profile')
                }}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Create My Meal Plan
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Weekly Plans</h3>
              <p className="text-gray-600 text-sm">Get 7-day meal plans with breakfast, lunch, dinner & snacks</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Shopping</h3>
              <p className="text-gray-600 text-sm">Auto-generated shopping lists organized by category</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Save Time</h3>
              <p className="text-gray-600 text-sm">No more daily "what to eat" decisions</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
