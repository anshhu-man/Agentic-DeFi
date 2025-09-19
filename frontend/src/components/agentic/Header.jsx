"use client"
import { Asterisk, MoreHorizontal, Menu, ChevronDown, Minimize2 } from "lucide-react"
import { useState } from "react"
import GhostIconButton from "./GhostIconButton"

export default function Header({ createNewChat, sidebarCollapsed, setSidebarOpen, onClose }) {
  const [selectedBot, setSelectedBot] = useState("GPT-5")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const chatbots = [
    { name: "GPT-5", icon: "🤖" },
    { name: "Claude Sonnet 4", icon: "🎭" },
    { name: "Gemini", icon: "💎" },
    { name: "Assistant", icon: <Asterisk className="h-4 w-4" /> },
  ]

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-gray-800"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="hidden md:flex relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold tracking-tight hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800"
        >
          {typeof chatbots.find((bot) => bot.name === selectedBot)?.icon === "string" ? (
            <span className="text-sm">{chatbots.find((bot) => bot.name === selectedBot)?.icon}</span>
          ) : (
            chatbots.find((bot) => bot.name === selectedBot)?.icon
          )}
          {selectedBot}
          <ChevronDown className="h-4 w-4" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg dark:border-gray-800 dark:bg-gray-950 z-50">
            {chatbots.map((bot) => (
              <button
                key={bot.name}
                onClick={() => {
                  setSelectedBot(bot.name)
                  setIsDropdownOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
              >
                {typeof bot.icon === "string" ? <span className="text-sm">{bot.icon}</span> : bot.icon}
                {bot.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="Exit Full Screen (Esc)"
          >
            <Minimize2 className="h-4 w-4" />
            Exit
          </button>
        )}
        <GhostIconButton label="More">
          <MoreHorizontal className="h-4 w-4" />
        </GhostIconButton>
      </div>
    </div>
  )
}
