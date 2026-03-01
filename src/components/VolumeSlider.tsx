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

interface EQBand {
  frequency: number
  gain: number
  Q: number
  type: 'lowshelf' | 'peaking' | 'highshelf'
}

const EQ_PRESETS = [
  { name: "Flat", gains: [0, 0, 0, 0, 0], description: "No EQ" },
  { name: "Bass Boost", gains: [6, 3, 0, -2, -2], description: "Enhanced low end" },
  { name: "Vocal", gains: [-2, -1, 4, 2, 1], description: "Clear vocals" },
  { name: "Bright", gains: [-2, 1, 2, 4, 6], description: "Crisp highs" },
  { name: "Warm", gains: [3, 2, 0, -1, -2], description: "Smooth & mellow" },
  { name: "Presence", gains: [-1, 2, 4, 3, 1], description: "Forward midrange" },
]

const BAND_NAMES = ["Low", "Low-Mid", "Mid", "High-Mid", "High"]
const BAND_FREQUENCIES = [100, 400, 1000, 2500, 8000]

export function VolumeSlider({ soundId, emoji, x, y, engine, onClose }: VolumeSliderProps) {
  const [volume, setVolume] = useState(0.5)
  const [eqBands, setEqBands] = useState<EQBand[]>([
    { frequency: 100, gain: 0, Q: 1, type: 'lowshelf' },
    { frequency: 400, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 1000, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 2500, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 8000, gain: 0, Q: 1, type: 'highshelf' },
  ])
  const [showEQ, setShowEQ] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load current volume
    const vol = engine.getSoundVolume(soundId)
    if (vol !== undefined) setVolume(vol)

    // Load current EQ settings
    const savedEQ = engine.getSoundEQ(soundId)
    if (savedEQ) {
      setEqBands(savedEQ as EQBand[])
    }

    // Close when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [soundId, engine, onClose])

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    engine.setSoundVolume(soundId, newVolume)
  }

  const handleEQChange = (bandIndex: number, gain: number) => {
    const newBands = [...eqBands]
    newBands[bandIndex].gain = gain
    setEqBands(newBands)
    engine.setEQBand(soundId, bandIndex, gain)
  }

  const applyEQPreset = (preset: typeof EQ_PRESETS[0]) => {
    const newBands = eqBands.map((band, i) => ({ ...band, gain: preset.gains[i] }))
    setEqBands(newBands)
    preset.gains.forEach((gain, i) => {
      engine.setEQBand(soundId, i, gain)
    })
  }

  // Draw EQ curve
  useEffect(() => {
    if (!showEQ || !canvasRef.current) return

    const canvas = canvasRef.current.querySelector('canvas')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width = 240
    const height = canvas.height = 80

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1

    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Calculate and draw EQ curve
    const curvePoints: { x: number; y: number }[] = []

    for (let px = 0; px <= width; px++) {
      const minFreq = Math.log10(20)
      const maxFreq = Math.log10(20000)
      const freqLog = minFreq + (px / width) * (maxFreq - minFreq)
      const freq = Math.pow(10, freqLog)

      let totalGain = 0

      eqBands.forEach(band => {
        const f = band.frequency
        const g = band.gain
        const Q = band.Q

        let gainAtFreq = 0

        if (band.type === 'lowshelf') {
          const ratio = f / freq
          gainAtFreq = g * ratio / (1 + ratio)
        } else if (band.type === 'highshelf') {
          const ratio = freq / f
          gainAtFreq = g * ratio / (1 + ratio)
        } else {
          const bandwidth = f / Q
          const dist = Math.abs(Math.log10(freq) - Math.log10(f))
          const octaves = dist / Math.log10(2)
          gainAtFreq = g * Math.exp(-0.5 * Math.pow(octaves / (bandwidth / f), 2))
        }

        totalGain += gainAtFreq
      })

      const maxY = height / 2
      const normalizedGain = Math.max(-12, Math.min(12, totalGain)) / 12
      const py = height / 2 - (normalizedGain * maxY)

      curvePoints.push({ x: px, y: py })
    }

    // Draw curve
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, 'rgba(139, 92, 246, 1)')
    gradient.addColorStop(0.5, 'rgba(236, 72, 153, 1)')
    gradient.addColorStop(1, 'rgba(139, 92, 246, 1)')

    ctx.strokeStyle = gradient
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y)

    for (let i = 1; i < curvePoints.length; i++) {
      ctx.lineTo(curvePoints[i].x, curvePoints[i].y)
    }

    ctx.stroke()

    // Fill under curve
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height)
    fillGradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)')
    fillGradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.1)')
    fillGradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)')
    ctx.fillStyle = fillGradient
    ctx.fill()

    // Draw band markers
    eqBands.forEach((band, index) => {
      const minFreq = Math.log10(20)
      const maxFreq = Math.log10(20000)
      const freqLog = Math.log10(band.frequency)
      const px = ((freqLog - minFreq) / (maxFreq - minFreq)) * width

      const normalizedGain = Math.max(-12, Math.min(12, band.gain)) / 12
      const py = height / 2 - (normalizedGain * height / 2)

      ctx.beginPath()
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = index === 2 ? '#ec4899' : '#8b5cf6'
      ctx.fill()
    })

  }, [eqBands, showEQ])

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
        minWidth: "280px",
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
        <div style={{ marginBottom: "12px" }}>
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
          marginBottom: showEQ ? "12px" : "0",
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

        {/* EQ Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowEQ(!showEQ)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: showEQ
              ? "linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(233, 196, 106, 0.3) 100%)"
              : "rgba(255,255,255,0.1)",
            border: showEQ
              ? "2px solid rgba(236, 72, 153, 0.6)"
              : "2px solid rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            marginBottom: showEQ ? "12px" : "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          🎛️ {showEQ ? "Hide" : "Show"} EQ
        </motion.button>

        <AnimatePresence>
          {showEQ && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              {/* EQ Curve */}
              <div ref={canvasRef} style={{
                marginBottom: "12px",
                padding: "8px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <canvas style={{ width: "100%", borderRadius: "4px" }} />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "4px",
                }}>
                  <span>20Hz</span>
                  <span>1kHz</span>
                  <span>20kHz</span>
                </div>
              </div>

              {/* EQ Presets */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}>
                  EQ Presets
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {EQ_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => applyEQPreset(preset)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      title={preset.description}
                    >
                      {preset.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* EQ Bands */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {eqBands.map((band, index) => (
                  <div key={index} style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.7)",
                    }}>
                      <span style={{ fontWeight: "600" }}>{BAND_NAMES[index]}</span>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>
                        {band.frequency >= 1000 ? `${band.frequency/1000}kHz` : `${band.frequency}Hz`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={band.gain}
                      onChange={(e) => handleEQChange(index, parseFloat(e.target.value))}
                      style={{
                        width: "100%",
                        height: "4px",
                        borderRadius: "2px",
                        background: "rgba(255,255,255,0.1)",
                        outline: "none",
                        WebkitAppearance: "none",
                        cursor: "pointer",
                      }}
                    />
                    <style>{`
                      .eq-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                        cursor: pointer;
                      }
                    `}</style>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      color: band.gain > 0 ? "#4ade80" : band.gain < 0 ? "#f87171" : "rgba(255,255,255,0.5)",
                      marginTop: "2px",
                    }}>
                      <span>-12dB</span>
                      <span>{band.gain > 0 ? '+' : ''}{band.gain}dB</span>
                      <span>+12dB</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
