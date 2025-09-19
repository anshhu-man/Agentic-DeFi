"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import DefiSearch from "./defi-search"

interface EnhancedSearchSectionProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onSearch?: (query: string) => void
  children?: React.ReactNode
  className?: string
}

export default function EnhancedSearchSection({
  searchQuery,
  onSearchChange,
  onSearch,
  children,
  className = ""
}: EnhancedSearchSectionProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const searchSectionRef = useRef<HTMLDivElement>(null)

  const handleFocus = () => {
    setSearchFocused(true)
  }

  const handleBlur = () => {
    setSearchFocused(false)
  }

  const handleSearch = (query: string) => {
    onSearch?.(query)
    setSearchFocused(false)
  }

  // Control main content visibility
  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      if (searchFocused) {
        mainContent.style.opacity = '0'
        mainContent.style.transform = 'translateY(20px)'
        mainContent.style.pointerEvents = 'none'
      } else {
        mainContent.style.opacity = '1'
        mainContent.style.transform = 'translateY(0)'
        mainContent.style.pointerEvents = 'auto'
      }
    }
  }, [searchFocused])

  return (
    <div ref={searchSectionRef} className={cn("relative", className)}>
      {/* Content above search that fades out on focus */}
      <div
        className={cn(
          "transition-all duration-500",
          searchFocused ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        {children}
      </div>

      {/* Search container that scales up on focus */}
      <div
        className={cn(
          "max-w-2xl mx-auto mb-8 transition-all duration-500",
          searchFocused ? "scale-105 mb-16" : "scale-100"
        )}
      >
        <DefiSearch
          value={searchQuery}
          onChange={onSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSearch={handleSearch}
        />
      </div>
    </div>
  )
}