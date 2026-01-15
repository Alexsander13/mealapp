import React from 'react'
export default function Button({ children, className = '', disabled, ...props }: any){
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  const defaultClasses = "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
  const finalClasses = className || `${baseClasses} ${defaultClasses}`
  
  return (
    <button 
      className={finalClasses.includes(baseClasses) ? finalClasses : `${baseClasses} ${finalClasses}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
