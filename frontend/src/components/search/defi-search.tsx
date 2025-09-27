"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Search,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Animated placeholder component
function AnimatedPlaceholder({ texts, className }: { texts: string[]; className?: string }) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(80)

  useEffect(() => {
    const text = texts[currentTextIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < text.length) {
          setCurrentText(text.substring(0, currentText.length + 1))
          setTypingSpeed(80)
        } else {
          setIsDeleting(true)
          setTypingSpeed(1000)
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(text.substring(0, currentText.length - 1))
          setTypingSpeed(40)
        } else {
          setIsDeleting(false)
          setCurrentTextIndex((currentTextIndex + 1) % texts.length)
          setTypingSpeed(500)
        }
      }
    }, typingSpeed)

    return () => clearTimeout(timeout)
  }, [currentText, currentTextIndex, isDeleting, texts, typingSpeed])

  return (
    <span className={className}>
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  )
}

interface DefiSearchProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onSearch?: (query: string) => void
  className?: string
}

export default function DefiSearch({ 
  value, 
  onChange, 
  onFocus, 
  onBlur, 
  onSearch,
  className = ""
}: DefiSearchProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setSearchFocused(true)
    setShowSuggestions(true)
    onFocus?.()
  }

  const handleBlur = () => {
    // Delay blur to allow clicking on suggestions
    setTimeout(() => {
      setSearchFocused(false)
      setShowSuggestions(false)
      onBlur?.()
    }, 150)
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (value.trim()) {
      onSearch?.(value.trim())
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    onSearch?.(suggestion)
    setShowSuggestions(false)
    searchInputRef.current?.blur()
  }

  // Popular DeFi search suggestions
  const popularSearches = [
    { name: "Uniswap V3 ETH/USDC", type: "Pool" },
    { name: "Compound USDT", type: "Lending" },
    { name: "Yearn Finance", type: "Yield" },
    { name: "1inch Aggregator", type: "DEX" },
    { name: "Aave ETH", type: "Lending" },
    { name: "SushiSwap", type: "DEX" },
  ]

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSearch}>
        <div className="relative group">
          {/* Enhanced glow effect on focus */}
          <div
            className={cn(
              "absolute -inset-1 bg-gradient-to-r rounded-3xl opacity-0 transition-all duration-500 blur-sm",
              searchFocused 
                ? "from-blue-500/30 via-purple-500/30 to-cyan-500/30 opacity-100 animate-glow" 
                : "from-blue-500/0 via-purple-500/0 to-cyan-500/0",
            )}
          />

          <div className="relative">
            <Input
              ref={searchInputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={searchFocused ? "" : "Search tokens, pools, vaults, strategies..."}
              className={cn(
                "h-16 pl-16 pr-36 rounded-3xl text-lg transition-all duration-500",
                "bg-white/5 backdrop-blur-xl border border-white/10",
                "text-foreground placeholder:text-muted-foreground/70",
                "focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20",
                "hover:bg-white/10 hover:border-white/20",
                searchFocused ? "bg-white/10 border-blue-400/50 shadow-2xl" : ""
              )}
            />

            {/* Animated placeholder when focused */}
            {searchFocused && value === "" && (
              <div className="absolute left-16 top-1/2 transform -translate-y-1/2 text-muted-foreground/80 pointer-events-none">
                <AnimatedPlaceholder
                  texts={["ETH/USDC pool", "Compound lending", "Yearn vaults", "1inch swaps"]}
                />
              </div>
            )}

            <Search className={cn(
              "absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-300",
              searchFocused ? "text-blue-400" : "text-muted-foreground"
            )} />

            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
              <span className={cn(
                "text-xs px-2 py-1 rounded-full font-medium transition-all duration-300",
                "bg-blue-500/20 text-blue-300 border border-blue-400/30",
                searchFocused ? "bg-blue-500/30 text-blue-200 shadow-lg shadow-blue-500/20" : ""
              )}>
                AI
              </span>
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-2xl transition-all duration-300",
                  "bg-gradient-to-r from-blue-600 to-purple-600",
                  "hover:from-blue-500 hover:to-purple-500",
                  "hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25",
                  "active:scale-95"
                )}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced search suggestions dropdown */}
        {showSuggestions && (
          <div className={cn(
            "absolute top-full left-0 right-0 mt-4 z-10",
            "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6",
            "shadow-2xl shadow-black/20 animate-slide-up"
          )}>
            <div className="text-sm text-muted-foreground/80 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
              <span className="font-medium">Popular searches</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {popularSearches.slice(0, 6).map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    "text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-3 group",
                    "hover:bg-white/10 hover:border-white/20 border border-transparent",
                    "hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
                  )}
                  onClick={() => handleSuggestionClick(item.name)}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500/50 group-hover:bg-blue-400 transition-all duration-300 group-hover:scale-125" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground group-hover:text-white transition-colors">{item.name}</div>
                    <div className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{item.type}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}