import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SpatialAudioEngine } from "../audio/SpatialAudioEngine"

interface SoundEQPanelProps {
  soundId: string
  emoji: string
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

export function SoundEQPanel({ soundId, emoji, engine, onClose }: SoundEQPanelProps) {
  const [eqBands, setEqBands] = useState<EQBand[]>([
    { frequency: 100, gain: 0, Q: 1, type: 'lowshelf' },
    { frequency: 400, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 1000, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 2500, gain: 0, Q: 1, type: 'peaking' },
    { frequency: 8000, gain: 0, Q: 1, type: 'highshelf' },
  ])
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load current EQ settings
    const savedEQ = engine.getSoundEQ(soundId)
    if (savedEQ) {
      setEqBands(savedEQ as EQBand[])
    }
  }, [soundId, engine])

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
    if (!canvasRef.current) return

    const canvas = canvasRef.current.querySelector('canvas')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width = 300
    const height = canvas.height = 120

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

    // Draw center line (0 dB)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

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
    ctx.lineWidth = 3
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
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fillStyle = index === 2 ? '#ec4899' : '#8b5cf6'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    })

  }, [eqBands])

  return (
    <motion.div
      initial={{ opacity: 0, x: 350 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 350 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute right-4 top-20 w-96 max-h-[calc(100vh-120px)] overflow-y-auto"
      style={{ zIndex: 1001 }}
    >
      <div className="p-5 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-white capitalize">{soundId}</h3>
              <p className="text-xs text-white/50">Parametric EQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        {/* EQ Curve */}
        <div className="mb-5 p-4 rounded-xl bg-black/40 border border-white/10">
          <div ref={canvasRef}>
            <canvas className="w-full rounded-lg" />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-2 px-1">
            <span>20Hz</span>
            <span>100Hz</span>
            <span>1kHz</span>
            <span>10kHz</span>
            <span>20kHz</span>
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1 px-1">
            <span>+12dB</span>
            <span>0dB</span>
            <span>-12dB</span>
          </div>
        </div>

        {/* EQ Presets */}
        <div className="mb-5">
          <h4 className="text-sm font-bold text-white/90 mb-3">EQ Presets</h4>
          <div className="grid grid-cols-3 gap-2">
            {EQ_PRESETS.map((preset) => (
              <motion.button
                key={preset.name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyEQPreset(preset)}
                className="px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/90 hover:text-white text-xs font-semibold transition-all"
                title={preset.description}
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* EQ Bands */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white/90">Frequency Bands</h4>
          {eqBands.map((band, index) => (
            <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-white/90">{BAND_NAMES[index]}</span>
                <span className="text-xs text-white/50">
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
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/20 transition-colors
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30
                  [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              />
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>-12dB</span>
                <span className={band.gain > 0 ? 'text-green-400' : band.gain < 0 ? 'text-red-400' : 'text-white/70'}>
                  {band.gain > 0 ? '+' : ''}{band.gain}dB
                </span>
                <span>+12dB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
