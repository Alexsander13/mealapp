import '@/styles/globals.css'
import React from 'react'

export const metadata = {
  title: 'Meal Planner',
  description: 'Minimal test UI for Meal Planner'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container mx-auto">{children}</div>
      </body>
    </html>
  )
}
