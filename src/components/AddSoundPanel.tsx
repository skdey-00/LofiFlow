import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface AddSoundPanelProps {
  isOpen: boolean
  onClose: () => void
  onAddSound: (name: string, emoji: string, audioFile: File) => void
}

const EMOJI_OPTIONS = [
  "🎹", "🎸", "🎺", "🎻", "🥁", "🎤",
  "🌊", "🔥", "⚡", "🌟", "🍃", "❄️",
  "🌧️", "⛈️", "🌬️", "💨", "🌙", "☀️",
  "🔔", "🎵", "🎶", "🎼", "🔊", "📻",
  "🚗", "✈️", "🚂", "🚁", "⛵", "🚀",
  "🐱", "🐶", "🐦", "🦁", "🐋", "🦋",
  "☕", "🍵", "🧊", "🔥", "🌲", "🏔️",
]

export function AddSoundPanel({ isOpen, onClose, onAddSound }: AddSoundPanelProps) {
  const [name, setName] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState("🎵")
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File | null) => {
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file)
      if (!name) {
        // Use filename without extension as default name
        const defaultName = file.name.replace(/\.[^/.]+$/, "")
        setName(defaultName)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleSubmit = () => {
    if (!name.trim() || !audioFile) return

    onAddSound(name.trim(), selectedEmoji, audioFile)

    // Reset form
    setName("")
    setSelectedEmoji("🎵")
    setAudioFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#1a1a2e] rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Add Custom Sound</h2>
                <p className="text-sm text-white/50">Upload your own audio to the soundscape</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center text-xl"
              >
                ×
              </motion.button>
            </div>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  Audio File
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-green-500 bg-green-500/10 scale-[1.02]"
                      : audioFile
                      ? "border-green-400/60 bg-green-500/5"
                      : "border-white/20 hover:border-purple-400/50 hover:bg-purple-500/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                  {audioFile ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-2"
                    >
                      <div className="text-4xl">✅</div>
                      <div className="text-base font-semibold text-white">{audioFile.name}</div>
                      <div className="text-sm text-green-400">{(audioFile.size / 1024 / 1024).toFixed(2)} MB • Ready to add</div>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl">🎵</div>
                      <div className="text-sm text-white/70 font-medium">Drop audio file or click to browse</div>
                      <div className="text-xs text-white/40">MP3, WAV, OGG, FLAC supported</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  Sound Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for this sound..."
                  className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 focus:bg-white/10 transition-all font-medium"
                />
              </div>

              {/* Emoji Selector */}
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <span className="text-lg">😀</span>
                  Choose Emoji
                </label>
                <div className="grid grid-cols-8 gap-2 p-4 rounded-xl bg-black/20 border border-white/10">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-all ${
                        selectedEmoji === emoji
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white shadow-lg shadow-purple-500/30"
                          : "bg-white/5 border-2 border-transparent hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Preview Card */}
              {name && audioFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-400/30"
                >
                  <div className="text-4xl">{selectedEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-white truncate">{name}</div>
                    <div className="text-xs text-white/50 truncate">{audioFile.name}</div>
                  </div>
                  <div className="text-green-400 text-2xl">✓</div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!name.trim() || !audioFile}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 border-2 border-transparent disabled:shadow-none"
                >
                  Add Sound
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
