import React from 'react'
export default function Select({children, className = '', ...props}:any){
  return <select className={`border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white ${className}`} {...props}>{children}</select>
}
