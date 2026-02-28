import { motion, AnimatePresence } from "framer-motion"
import { SpatialAudioEngine } from "../audio/SpatialAudioEngine"
import { PRESETS, Preset } from "../lib/presets"

export type { Preset }

interface PresetPanelProps {
  engine: SpatialAudioEngine
  isOpen: boolean
  onClose: () => void
  onSelectPreset: (preset: Preset) => void
}

export function PresetPanel({ engine, isOpen, onClose, onSelectPreset }: PresetPanelProps) {
  const applyPreset = (preset: Preset) => {
    // Apply effects
    engine.setEffectAmount("reverb", preset.effects.reverb)
    engine.setEffectAmount("delay", preset.effects.delay)
    engine.setDelayTime(preset.effects.delayTime)
    engine.setDelayFeedback(preset.effects.delayFeedback)
    engine.toggleLofi(preset.lofi)

    // Apply sound positions
    preset.sounds.forEach((sound) => {
      engine.updatePosition(sound.id, sound.position[0], sound.position[1])
    })

    onSelectPreset(preset)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute left-4 top-20 w-80 max-h-[calc(100vh-120px)] overflow-y-auto"
        >
          <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium text-sm tracking-wide">Presets</h3>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {PRESETS.map((preset, index) => (
                <motion.button
                  key={preset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => applyPreset(preset)}
                  className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{preset.emoji}</span>
                        <span className="text-white font-medium text-sm">{preset.name}</span>
                      </div>
                      <p className="text-white/50 text-xs">{preset.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {preset.lofi && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs">
                          Lofi
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-white/30 text-xs text-center">
                Click a preset to instantly apply sound positions, effects, and settings
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
