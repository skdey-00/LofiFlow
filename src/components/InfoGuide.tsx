import { motion, AnimatePresence } from "framer-motion"

interface InfoGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoGuide({ isOpen, onClose }: InfoGuideProps) {
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
            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-lg border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎵</div>
                <h2 className="text-xl font-bold text-white">How to Use Lofi Flow</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center text-lg"
              >
                ×
              </motion.button>
            </div>

            <div className="space-y-5">
              {/* Section 1: Basic Controls */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  🎯 Basic Controls
                </h3>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-semibold">•</span>
                    <span><strong className="text-white">Drag</strong> any sound icon to position it in 3D space</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-semibold">•</span>
                    <span><strong className="text-white">Double-click</strong> to mute/unmute a sound</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-semibold">•</span>
                    <span><strong className="text-white">Single-click</strong> to open volume control</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-semibold">•</span>
                    <span><strong className="text-white">Right-click</strong> custom sounds to remove them</span>
                  </li>
                </ul>
              </div>

              {/* Section 2: Presets */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  📚 Presets
                </h3>
                <p className="text-sm text-white/80 mb-2">
                  Click the <strong className="text-blue-300">Presets</strong> button to access pre-configured soundscapes:
                </p>
                <ul className="space-y-1 text-xs text-white/70">
                  <li>• 🌧️ Cozy Rain - Perfect for relaxation</li>
                  <li>• ☕ Coffee Shop - Ambient cafe vibe</li>
                  <li>• 🌙 Late Night - Chill nighttime sounds</li>
                  <li>• ⛈️ Stormy Night - Rain with thunder</li>
                  <li>• 📚 Study Session - Focus-friendly mix</li>
                </ul>
              </div>

              {/* Section 3: Effects */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  🎛️ Effects & Lofi Mode
                </h3>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-semibold">•</span>
                    <span><strong className="text-amber-300">Reverb</strong> - Adds spacious, room-like ambiance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-semibold">•</span>
                    <span><strong className="text-amber-300">Delay</strong> - Creates echo effects for depth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-semibold">•</span>
                    <span><strong className="text-amber-300">Lofi</strong> - Warm, filtered vintage sound</span>
                  </li>
                </ul>
              </div>

              {/* Section 4: Spatial Audio */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  🎧 Spatial Audio
                </h3>
                <p className="text-sm text-white/80">
                  Sounds closer to the <strong className="text-green-300">center</strong> are louder and clearer.
                  As you drag them away, they become quieter and more filtered.
                  Near walls, sounds get extra reverb!
                </p>
              </div>

              {/* Section 5: Custom Sounds */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-400/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  ➕ Add Custom Sounds
                </h3>
                <p className="text-sm text-white/80">
                  Upload your own audio files! Click <strong className="text-green-300">Add Sound</strong> to
                  import MP3, WAV, OGG, or FLAC files with custom names and emojis.
                </p>
              </div>

              {/* Tips */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  💡 Pro Tips
                </h3>
                <ul className="space-y-1 text-xs text-white/70">
                  <li>• Combine presets with custom adjustments for unique soundscapes</li>
                  <li>• Use headphones for the best spatial audio experience</li>
                  <li>• Volume settings are preserved when moving sounds</li>
                  <li>• Muted sounds show a 🔇 icon indicator</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-white/50">
                Made with 🎵 by skdey-00 • Physics-based Spatial Audio Mixer
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
