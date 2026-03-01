import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SpatialAudioEngine } from "../audio/SpatialAudioEngine"

interface EQPanelProps {
  engine: SpatialAudioEngine
  isOpen: boolean
  onClose: () => void
}

interface EQBand {
  name: string
  frequency: number
  gain: number
  Q: number
  type: 'lowshelf' | 'peaking' | 'highshelf'
}

const BANDS: EQBand[] = [
  { name: "Low", frequency: 100, gain: 0, Q: 1, type: 'lowshelf' },
  { name: "Low-Mid", frequency: 400, gain: 0, Q: 1, type: 'peaking' },
  { name: "Mid", frequency: 1000, gain: 0, Q: 1, type: 'peaking' },
  { name: "High-Mid", frequency: 2500, gain: 0, Q: 1, type: 'peaking' },
  { name: "High", frequency: 8000, gain: 0, Q: 1, type: 'highshelf' },
]

export function EQPanel({ engine, isOpen, onClose }: EQPanelProps) {
  const [bands, setBands] = useState<EQBand[]>(BANDS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Update EQ in audio engine when bands change
  useEffect(() => {
    bands.forEach((band, index) => {
      engine.setEQBand(index, band.frequency, band.gain, band.Q, band.type)
    })
  }, [bands, engine])

  // Draw EQ curve
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1

    // Vertical lines (frequency)
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal lines (dB)
    for (let i = 0; i <= 8; i++) {
      const y = (height / 8) * i
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

    // Calculate EQ curve
    const curvePoints: { x: number; y: number }[] = []

    for (let px = 0; px <= width; px++) {
      // Convert pixel to logarithmic frequency scale (20Hz - 20kHz)
      const minFreq = Math.log10(20)
      const maxFreq = Math.log10(20000)
      const freqLog = minFreq + (px / width) * (maxFreq - minFreq)
      const freq = Math.pow(10, freqLog)

      // Calculate gain at this frequency from all bands
      let totalGain = 0

      bands.forEach(band => {
        const f = band.frequency
        const g = band.gain
        const Q = band.Q

        let gainAtFreq = 0

        if (band.type === 'lowshelf') {
          // Low shelf filter
          const ratio = f / freq
          gainAtFreq = g * ratio / (1 + ratio)
        } else if (band.type === 'highshelf') {
          // High shelf filter
          const ratio = freq / f
          gainAtFreq = g * ratio / (1 + ratio)
        } else {
          // Peaking filter
          const bandwidth = f / Q
          const dist = Math.abs(Math.log10(freq) - Math.log10(f))
          const octaves = dist / Math.log10(2)
          gainAtFreq = g * Math.exp(-0.5 * Math.pow(octaves / (bandwidth / f), 2))
        }

        totalGain += gainAtFreq
      })

      // Convert gain to Y position (centered, +/- 12dB range)
      const maxY = height / 2
      const normalizedGain = Math.max(-12, Math.min(12, totalGain)) / 12
      const py = height / 2 - (normalizedGain * maxY)

      curvePoints.push({ x: px, y: py })
    }

    // Draw EQ curve with gradient
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
    bands.forEach((band, index) => {
      const minFreq = Math.log10(20)
      const maxFreq = Math.log10(20000)
      const freqLog = Math.log10(band.frequency)
      const px = ((freqLog - minFreq) / (maxFreq - minFreq)) * width

      const normalizedGain = Math.max(-12, Math.min(12, band.gain)) / 12
      const py = height / 2 - (normalizedGain * height / 2)

      // Marker circle
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fillStyle = index === 2 ? '#ec4899' : '#8b5cf6'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    })

  }, [bands])

  const updateBand = (index: number, key: keyof EQBand, value: number) => {
    setBands(prev => prev.map((band, i) =>
      i === index ? { ...band, [key]: value } : band
    ))
  }

  const resetEQ = () => {
    setBands(BANDS.map(band => ({ ...band, gain: 0 })))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute right-4 top-20 w-80 max-h-[calc(100vh-120px)] overflow-y-auto"
        >
          <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium text-sm tracking-wide flex items-center gap-2">
                <span>🎛️</span>
                <span>Parametric EQ</span>
              </h3>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors text-lg"
              >
                ×
              </button>
            </div>

            {/* EQ Curve Visualization */}
            <div className="mb-4 p-3 rounded-xl bg-black/30 border border-white/10">
              <canvas
                ref={canvasRef}
                width={280}
                height={120}
                className="w-full rounded-lg"
              />
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

            {/* EQ Bands */}
            <div className="space-y-3 mb-4">
              {bands.map((band, index) => (
                <div key={band.name} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-white/90">{band.name}</span>
                    <span className="text-xs text-white/50">{band.frequency >= 1000 ? `${band.frequency/1000}kHz` : `${band.frequency}Hz`}</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={band.gain}
                    onChange={(e) => updateBand(index, 'gain', parseFloat(e.target.value))}
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

            {/* Reset Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetEQ}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
            >
              Reset EQ
            </motion.button>

            {/* Info */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-white/30 text-xs text-center">
                Adjust frequency bands to shape your sound
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
