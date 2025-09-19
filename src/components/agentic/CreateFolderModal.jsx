"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X, Lightbulb } from "lucide-react"
import { useState } from "react"

export default function CreateFolderModal({ isOpen, onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (folderName.trim()) {
      onCreateFolder(folderName.trim())
      setFolderName("")
      onClose()
    }
  }

  const handleCancel = () => {
    setFolderName("")
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Folder name</h2>
              <button onClick={handleCancel} className="rounded-lg p-1 hover:bg-muted dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="E.g. Marketing Projects"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800"
                autoFocus
              />

              <div className="mt-4 flex items-start gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                <Lightbulb className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">What's a folder?</div>
                  <div>
                    Folders keep chats, files, and custom instructions in one place. Use them for ongoing work, or just
                    to keep things tidy.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!folderName.trim()}
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-card dark:text-gray-900 dark:hover:bg-muted"
                >
                  Create folder
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
