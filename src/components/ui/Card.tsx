import React from 'react'
export default function Card({children, className = ''}:any){
  return <div className={`bg-white rounded-2xl shadow-card border border-gray-100 ${className}`}>{children}</div>
}
