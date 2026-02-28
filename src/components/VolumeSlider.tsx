import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SpatialAudioEngine } from "../audio/SpatialAudioEngine"

interface VolumeSliderProps {
  soundId: string
  emoji: string
  x: number
  y: number
  engine: SpatialAudioEngine
  onClose: () => void
}

export function VolumeSlider({ soundId, emoji, x, y, engine, onClose }: VolumeSliderProps) {
  const [volume, setVolume] = useState(0.5)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    engine.setSoundVolume(soundId, newVolume)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      ref={sliderRef}
      style={{
        position: "absolute",
        left: `calc(50% + ${x + 40}px)`,
        top: `calc(50% + ${y}px - 30px)`,
        zIndex: 1000,
      }}
    >
      <div style={{
        background: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(16px)",
        border: "2px solid rgba(255,255,255,0.2)",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: "200px",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}>
          <span style={{ fontSize: "24px" }}>{emoji}</span>
          <div style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              textTransform: "capitalize",
            }}>
              {soundId}
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "20px",
                padding: "0",
                lineHeight: "1",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "white"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            >
              ×
            </button>
          </div>
        </div>

        {/* Volume Slider */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.6)",
          }}>
            <span>🔊 Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: "rgba(255,255,255,0.1)",
              outline: "none",
              WebkitAppearance: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
              transition: transform 0.2s;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.2);
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
            }
          `}</style>
        </div>

        {/* Quick preset volumes */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
        }}>
          {[0, 0.25, 0.5, 0.75, 1].map((vol) => (
            <motion.button
              key={vol}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleVolumeChange(vol)}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: "8px",
                background: volume === vol
                  ? "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
                  : "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {vol === 0 ? "🔇" : vol === 1 ? "🔊" : `${Math.round(vol * 100)}%`}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
