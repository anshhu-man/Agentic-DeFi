"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, LayoutGrid, MoreHorizontal } from "lucide-react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import GhostIconButton from "./GhostIconButton"
import ThemeToggle from "./ThemeToggle"
import { useChat } from "../../contexts/ChatContext"
import { useAuth } from "../../hooks/useAuth"
import apiService from "../../services/api"
import { useToast } from "../../hooks/use-toast"
/* Removed mockData import; using empty defaults to avoid bundling demo data */
const INITIAL_CONVERSATIONS = [];
const INITIAL_TEMPLATES = [];
const INITIAL_FOLDERS = [];

export default function AIAssistantUI({ onClose }) {
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("theme")
    if (saved) return saved
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark"
    return "light"
  })

  useEffect(() => {
    try {
      if (theme === "dark") document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-theme", theme)
      document.documentElement.style.colorScheme = theme
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    try {
      const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")
      if (!media) return
      const listener = (e) => {
        const saved = localStorage.getItem("theme")
        if (!saved) setTheme(e.matches ? "dark" : "light")
      }
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    } catch {}
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      return raw ? JSON.parse(raw) : { pinned: true, recent: false, folders: true, templates: true }
    } catch {
      return { pinned: true, recent: false, folders: true, templates: true }
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed))
    } catch {}
  }, [collapsed])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state")
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed-state", JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState("widget-sync")
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES)
  const [folders, setFolders] = useState(INITIAL_FOLDERS)
  
  // Get shared chat context
  const { messages: sharedMessages, addMessage, isGenerating, setIsGenerating } = useChat()
  const { user } = useAuth()
  const { toast } = useToast()

  const [query, setQuery] = useState("")
  const searchRef = useRef(null)

  const [isThinking, setIsThinking] = useState(false)
  const [thinkingConvId, setThinkingConvId] = useState(null)

  // Create synthetic conversation from shared chat context
  const widgetSyncConversation = useMemo(() => ({
    id: "widget-sync",
    title: "Chart Assistant",
    updatedAt: new Date().toISOString(),
    messageCount: sharedMessages.length,
    preview: sharedMessages.length > 1 ? sharedMessages[sharedMessages.length - 1].content.substring(0, 50) + "..." : "AI-powered charts and analytics",
    pinned: true,
    folder: null,
    messages: sharedMessages.map(msg => ({
      id: msg.id,
      role: msg.type,
      content: msg.content,
      chartData: msg.chartData,
      chartType: msg.chartType,
      createdAt: new Date(msg.timestamp || Date.now()).toISOString()
    }))
  }), [sharedMessages])

  // Merge widget conversation with other conversations
  const allConversations = useMemo(() => {
    const otherConversations = conversations.filter(c => c.id !== "widget-sync")
    return [widgetSyncConversation, ...otherConversations]
  }, [widgetSyncConversation, conversations])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen, conversations])

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      createNewChat()
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return allConversations
    const q = query.toLowerCase()
    return allConversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
  }, [allConversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const recent = filtered
    .filter((c) => !c.pinned)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10)

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]))
    for (const c of conversations) if (map[c.folder] != null) map[c.folder] += 1
    return map
  }, [conversations, folders])

  function togglePin(id) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  function createNewChat() {
    const id = Math.random().toString(36).slice(2)
    const item = {
      id,
      title: "New Chat",
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      preview: "Say hello to start...",
      pinned: false,
      folder: "Work Projects",
      messages: [], // Ensure messages array is empty for new chats
    }
    setConversations((prev) => [item, ...prev])
    setSelectedId(id)
    setSidebarOpen(false)
  }

  function createFolder() {
    const name = prompt("Folder name")
    if (!name) return
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert("Folder already exists.")
    setFolders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name }])
  }

  const mapVisualizationToChart = (viz) => {
    try {
      if (!viz) return null;
      const type = (viz?.config && viz?.config?.chartType) || viz?.type;
      const data = viz?.data || [];
      switch (type) {
        case 'bar': {
          if (Array.isArray(data) && data.length > 0) {
            if ('protocol' in data[0] && 'apy' in data[0]) {
              return {
                chartType: 'bar',
                data: data.map((d) => ({
                  category: d.protocol ?? d.label ?? 'Item',
                  value: typeof d.apy === 'string' ? parseFloat(d.apy) : d.apy,
                })),
              };
            }
            if ('category' in data[0] && 'value' in data[0]) {
              return { chartType: 'bar', data };
            }
          }
          return null;
        }
        case 'line': {
          if (Array.isArray(data) && data.length > 0) {
            if ('time' in data[0] && 'value' in data[0]) {
              return { chartType: 'line', data };
            }
            if ('timestamp' in data[0] && 'value' in data[0]) {
              return { chartType: 'line', data: data.map((d) => ({ month: d.timestamp, value: d.value })) };
            }
          }
          return null;
        }
        case 'area': {
          if (Array.isArray(data) && data.length > 0) {
            if ('time' in data[0] && 'portfolio' in data[0]) {
              return { chartType: 'area', data };
            }
            if ('time' in data[0] && 'value' in data[0]) {
              return { chartType: 'area', data: data.map((d) => ({ time: d.time, portfolio: d.value })) };
            }
          }
          return null;
        }
        case 'pie': {
          if (Array.isArray(data) && data.length > 0) {
            if ('name' in data[0] && 'value' in data[0]) {
              return { chartType: 'pie', data };
            }
            if ('label' in data[0] && 'value' in data[0]) {
              return {
                chartType: 'pie',
                data: data.map((d, i) => ({
                  name: d.label,
                  value: d.value,
                  fill: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))'][i % 3],
                })),
              };
            }
          }
          return null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  async function sendMessage(convId, content) {
    if (!content.trim()) return
    
    // Handle widget-sync conversation with ChatContext
    if (convId === "widget-sync") {
      addMessage({
        type: 'user',
        content: content
      })
      
      setIsGenerating(true)
      setIsThinking(true)
      setThinkingConvId(convId)

      try {
        const res = await apiService.query({ query: content, userAddress: user?.id || undefined })
        if (res?.success && res?.data?.results) {
          const summary = res.data.results.summary || `Here are insights for: "${content}".`
          const viz = res.data.results.visualizations?.find((v) => (v.type === 'chart') || (v?.config && v?.config?.chartType)) || null
          const mapped = viz ? mapVisualizationToChart(viz) : null
          addMessage({
            type: 'assistant',
            content: summary,
            chartData: mapped?.data,
            chartType: mapped?.chartType
          })
        } else {
          throw new Error((res && res.error && res.error.message) || 'AI response failed')
        }
      } catch (error) {
        console.error('Error getting AI response:', error)
        addMessage({
          type: 'assistant',
          content: `I understand you want help with: "${content}".`
        })
      } finally {
        setIsGenerating(false)
        setIsThinking(false)
        setThinkingConvId(null)
      }
      return
    }

    // Handle regular conversations
    const now = new Date().toISOString()
    const userMsg = { id: Math.random().toString(36).slice(2), role: "user", content, createdAt: now }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = [...(c.messages || []), userMsg]
        return {
          ...c,
          messages: msgs,
          updatedAt: now,
          messageCount: msgs.length,
          preview: content.slice(0, 80),
        }
      }),
    )

    setIsThinking(true)
    setThinkingConvId(convId)

    try {
      const res = await apiService.query({ query: content, userAddress: user?.id || undefined })
      const currentConvId = convId
      if (res?.success && res?.data?.results) {
        const summary = res.data.results.summary || 'Here are the insights.'
        const viz = res.data.results.visualizations?.find((v) => (v.type === 'chart') || (v?.config && v?.config?.chartType)) || null
        const mapped = viz ? mapVisualizationToChart(viz) : null
        const asstMsg = {
          id: Math.random().toString(36).slice(2),
          role: "assistant",
          content: summary,
          chartData: mapped?.data,
          chartType: mapped?.chartType,
          createdAt: new Date().toISOString(),
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConvId) return c
            const msgs = [...(c.messages || []), asstMsg]
            return {
              ...c,
              messages: msgs,
              updatedAt: new Date().toISOString(),
              messageCount: msgs.length,
              preview: asstMsg.content.slice(0, 80),
            }
          }),
        )
      } else {
        throw new Error((res && res.error && res.error.message) || 'AI response failed')
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      const currentConvId = convId
      const asstMsg = {
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: `Got it — I'll help with that.`,
        createdAt: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConvId) return c
          const msgs = [...(c.messages || []), asstMsg]
          return {
            ...c,
            messages: msgs,
            updatedAt: new Date().toISOString(),
            messageCount: msgs.length,
            preview: asstMsg.content.slice(0, 80),
          }
        }),
      )
    } finally {
      setIsThinking(false)
      setThinkingConvId(null)
    }
  }

  function editMessage(convId, messageId, newContent) {
    const now = new Date().toISOString()
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = (c.messages || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, editedAt: now } : m,
        )
        return {
          ...c,
          messages: msgs,
          preview: msgs[msgs.length - 1]?.content?.slice(0, 80) || c.preview,
        }
      }),
    )
  }

  function resendMessage(convId, messageId) {
    const conv = conversations.find((c) => c.id === convId)
    const msg = conv?.messages?.find((m) => m.id === messageId)
    if (!msg) return
    sendMessage(convId, msg.content)
  }

  function pauseThinking() {
    setIsThinking(false)
    setThinkingConvId(null)
  }

  function handleUseTemplate(template) {
    // This will be passed down to the Composer component
    // The Composer will handle inserting the template content
    if (composerRef.current) {
      composerRef.current.insertTemplate(template.content)
    }
  }

  const composerRef = useRef(null)

  const selected = allConversations.find((c) => c.id === selectedId) || widgetSyncConversation

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> AI Assistant
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="Schedule">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="Apps">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="flex h-full w-full max-w-none">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          conversations={allConversations}
          pinned={pinned}
          recent={recent}
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
        />

        <main className="relative flex min-w-0 flex-1 flex-col h-full">
          <Header createNewChat={createNewChat} sidebarCollapsed={sidebarCollapsed} setSidebarOpen={setSidebarOpen} onClose={onClose} />
          <ChatPane
            ref={composerRef}
            conversation={selected}
            onSend={(content) => selected && sendMessage(selected.id, content)}
            onEditMessage={(messageId, newContent) => selected && editMessage(selected.id, messageId, newContent)}
            onResendMessage={(messageId) => selected && resendMessage(selected.id, messageId)}
            isThinking={isThinking && thinkingConvId === selected?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
    </div>
  )
}
