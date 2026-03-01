import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SpatialAudioEngine } from "./audio/SpatialAudioEngine"
import { LofiToggle } from "./components/LofiToggle"
import { EffectsPanel } from "./components/EffectsPanel"
import { PresetPanel } from "./components/PresetPanel"
import { AddSoundPanel } from "./components/AddSoundPanel"
import { VolumeSlider } from "./components/VolumeSlider"
import { InfoGuide } from "./components/InfoGuide"

const SOUND_CONFIG = [
  { id: "rain", emoji: "🌧️", x: 0, y: -100, muted: false },
  { id: "cafe", emoji: "☕", x: 0, y: 100, muted: false },
  { id: "vinyl", emoji: "📀", x: 100, y: 0, muted: false },
]

interface Sound {
  id: string
  emoji: string
  x: number
  y: number
  muted: boolean
  custom?: boolean
}

export default function App() {
  const engine = useMemo(() => new SpatialAudioEngine(), [])
  const [started, setStarted] = useState(false)
  const [sounds, setSounds] = useState<Sound[]>(SOUND_CONFIG)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showEffects, setShowEffects] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showAddSound, setShowAddSound] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [soundCounter, setSoundCounter] = useState(0)
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null)
  const [hasDragged, setHasDragged] = useState(false)
  const [mouseDownTime, setMouseDownTime] = useState(0)
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 })
  const [presetKey, setPresetKey] = useState(0)

  const handleMute = (id: string) => {
    const sound = sounds.find(s => s.id === id)
    if (!sound) return

    const newMutedState = !sound.muted
    engine.setMute(id, newMutedState)
    setSounds(prev => prev.map(s => s.id === id ? { ...s, muted: newMutedState } : s))
  }

  const handleIconMouseDown = (e: React.MouseEvent, soundId: string) => {
    setHasDragged(false)
    setMouseDownTime(Date.now())
    setMouseDownPos({ x: e.clientX, y: e.clientY })

    // Calculate offset from center of icon to mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const iconCenterX = rect.left + rect.width / 2
    const iconCenterY = rect.top + rect.height / 2
    const offsetX = e.clientX - iconCenterX
    const offsetY = e.clientY - iconCenterY
    setDragOffset({ x: offsetX, y: offsetY })

    // Don't start dragging immediately - wait to see if it's a drag or click
    const checkDrag = (moveEvent: MouseEvent) => {
      const movedDist = Math.sqrt(
        Math.pow(moveEvent.clientX - mouseDownPos.x, 2) +
        Math.pow(moveEvent.clientY - mouseDownPos.y, 2)
      )
      if (movedDist > 5) { // Moved more than 5px, it's a drag
        setDraggingId(soundId)
        setHasDragged(true)
        window.removeEventListener('mousemove', checkDrag)
      }
    }

    window.addEventListener('mousemove', checkDrag)

    // Clean up the check listener after a short delay
    setTimeout(() => {
      window.removeEventListener('mousemove', checkDrag)
    }, 200)
  }

  const handleIconMouseUp = (soundId: string) => {
    // Only show volume slider if it was a click (not a drag)
    const timeSinceMouseDown = Date.now() - mouseDownTime
    if (!hasDragged && timeSinceMouseDown < 300) {
      setSelectedSoundId(soundId === selectedSoundId ? null : soundId)
    }
  }

  const handleAddSound = async (_name: string, emoji: string, audioFile: File) => {
    const newId = `custom-${soundCounter}`
    setSoundCounter(prev => prev + 1)

    // Load and play the sound
    await engine.loadSoundFromFile(newId, audioFile)
    engine.playSound(newId)

    // Add to sounds array with random position near the center
    const randomAngle = Math.random() * Math.PI * 2
    const randomDistance = 50 + Math.random() * 100
    const newX = Math.cos(randomAngle) * randomDistance
    const newY = Math.sin(randomAngle) * randomDistance

    const newSound: Sound = {
      id: newId,
      emoji,
      x: newX,
      y: newY,
      muted: false,
      custom: true,
    }

    setSounds(prev => [...prev, newSound])

    // Set initial spatial position
    setTimeout(() => {
      engine.updatePosition(newId, newX / 50, newY / 50)
    }, 100)
  }

  const handleRemoveSound = (id: string) => {
    const sound = sounds.find(s => s.id === id)
    if (!sound?.custom) return // Only allow removing custom sounds

    // Stop the sound in the engine
    engine.stopSound(id)

    // Remove from state
    setSounds(prev => prev.filter(s => s.id !== id))
  }

  useEffect(() => {
    if (!started) return

    // Resume AudioContext first (required by browsers after user interaction)
    engine.resumeContext().then(() => {
      // Load and play each sound immediately as it loads
      const soundFiles = [
        { id: "rain", url: "/sounds/rain.mp3" },
        { id: "cafe", url: "/sounds/cafe.mp3" },
        { id: "vinyl", url: "/sounds/vinyl.mp3" }
      ]

      soundFiles.forEach(({ id, url }) => {
        engine.loadSound(id, url).then(() => {
          engine.playSound(id)
          // Initialize spatial position immediately after playing
          const sound = SOUND_CONFIG.find(s => s.id === id)
          if (sound) {
            engine.updatePosition(id, sound.x / 50, sound.y / 50)
          }
        })
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return

      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const newX = e.clientX - centerX - dragOffset.x
      const newY = e.clientY - centerY - dragOffset.y

      // Limit to circle bounds
      const distance = Math.sqrt(newX * newX + newY * newY)
      const maxDist = 280
      let finalX = newX
      let finalY = newY

      if (distance > maxDist) {
        const angle = Math.atan2(newY, newX)
        finalX = Math.cos(angle) * maxDist
        finalY = Math.sin(angle) * maxDist
      }

      const ax = finalX / 50
      const ay = finalY / 50
      engine.updatePosition(draggingId, ax, ay)

      // Use immediate update during drag for responsiveness
      setSounds(prev => prev.map(s => s.id === draggingId ? { ...s, x: finalX, y: finalY } : s))
    }

    const handleMouseUp = () => {
      setDraggingId(null)
      setDragOffset({ x: 0, y: 0 })
    }

    if (draggingId) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingId, dragOffset, engine])

  // Global mouse up to reset drag state
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setHasDragged(false)
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [])

  if (!started) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Animated background elements */}
        <div style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "pulse 4s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)",
          top: "30%",
          left: "30%",
          animation: "pulse 3s ease-in-out infinite 0.5s"
        }} />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", zIndex: 1 }}
        >
          <div style={{ fontSize: "72px", marginBottom: "16px" }}>🎵</div>
          <h1 style={{
            fontSize: "56px",
            fontWeight: "800",
            marginBottom: "12px",
            background: "linear-gradient(135deg, #fff 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Lofi Flow
          </h1>
          <p style={{
            fontSize: "20px",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "40px",
            fontWeight: "300",
            letterSpacing: "0.5px"
          }}>
            Physics-based Spatial Audio Mixer
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStarted(true)}
            style={{
              padding: "18px 48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
              border: "none",
              color: "white",
              fontSize: "18px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)",
              transition: "all 0.3s ease"
            }}
          >
            Click to Start
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Top Bar */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "12px",
        zIndex: 100,
        padding: "8px",
        borderRadius: "20px",
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
      }}>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddSound(true)}
          style={{
            padding: "12px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)",
            border: "2px solid rgba(34, 197, 94, 0.5)",
            color: "rgba(134, 239, 172, 1)",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.2)"
          }}
        >
          ➕ Add Sound
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPresets(!showPresets)}
          style={{
            padding: "12px 20px",
            borderRadius: "12px",
            background: showPresets
              ? "linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(167, 139, 250, 0.3) 100%)"
              : "rgba(255,255,255,0.1)",
            border: showPresets
              ? "2px solid rgba(139, 92, 246, 0.6)"
              : "2px solid rgba(255,255,255,0.2)",
            color: showPresets ? "rgba(196, 181, 253, 1)" : "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: showPresets ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none"
          }}
        >
          📚 Presets
        </motion.button>
        <LofiToggle engine={engine} onToggleEffects(() => setShowEffects(!showEffects)} showEffects={showEffects} />
      </div>

      {/* Info Button - Top Right */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowInfo(true)}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "18px",
          cursor: "pointer",
          transition: "all 0.2s",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)"
          e.currentTarget.style.color = "rgba(255,255,255,0.8)"
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)"
          e.currentTarget.style.color = "rgba(255,255,255,0.5)"
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
        }}
      >
        ℹ️
      </motion.button>

      {/* Effects Panel */}
      <AnimatePresence>
        {showEffects && (
          <EffectsPanel engine={engine} />
        )}
      </AnimatePresence>

      {/* Presets Panel */}
      <PresetPanel
        engine={engine}
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        onSelectPreset={(preset) => {
          // Update sound positions in UI when preset is selected
          setPresetKey(prev => prev + 1) // Force re-render by updating key

          setSounds(prevSounds => {
            const newSounds = prevSounds.map(sound => {
              const presetSound = preset.sounds.find(s => s.id === sound.id)
              if (presetSound) {
                // Convert from audio engine coordinates to pixel coordinates
                const pixelX = presetSound.position[0] * 50
                const pixelY = presetSound.position[1] * 50

                // Create a completely new object to ensure React detects the change
                return {
                  ...sound,
                  x: pixelX,
                  y: pixelY,
                  muted: sound.muted, // Preserve muted state
                  custom: sound.custom // Preserve custom flag
                }
              }
              // Keep custom sounds in their current position
              return { ...sound }
            })
            return [...newSounds]
          })
        }}
      />

      {/* Add Sound Panel */}
      <AddSoundPanel
        isOpen={showAddSound}
        onClose={() => setShowAddSound(false)}
        onAddSound={handleAddSound}
      />

      {/* Info Guide */}
      <InfoGuide
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
      />

      {/* Spatial Grid */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, rgba(255,255,255,0.02) 50%, transparent 70%)",
        border: "2px solid rgba(255,255,255,0.1)",
        boxShadow: "0 0 60px rgba(139, 92, 246, 0.1), inset 0 0 60px rgba(139, 92, 246, 0.05)"
      }}>
        {/* Center dot */}
        <div style={{
          position: "absolute",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fff 0%, #a78bfa 100%)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 20px rgba(167, 139, 250, 0.6), 0 0 40px rgba(167, 139, 250, 0.3)"
        }} />

        {/* Sound Icons */}
        {sounds.map((sound) => (
          <motion.div
            key={`${sound.id}-${presetKey}`}
            onMouseDown={(e) => handleIconMouseDown(e, sound.id)}
            onMouseUp={() => handleIconMouseUp(sound.id)}
            onDoubleClick={() => handleMute(sound.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (sound.custom) {
                handleRemoveSound(sound.id)
              }
            }}
            animate={{
              x: sound.x,
              y: sound.y,
              opacity: sound.muted ? 0.5 : 1,
              scale: draggingId === sound.id ? 1.05 : 1,
            }}
            transition={draggingId === sound.id ? {
              type: "tween",
              duration: 0,
              ease: "linear"
            } : {
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            style={{
              position: "absolute",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: sound.custom
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)"
                : draggingId === sound.id
                ? "rgba(255,255,255,0.3)"
                : selectedSoundId === sound.id
                ? "rgba(139, 92, 246, 0.3)"
                : "rgba(255,255,255,0.15)",
              backdropFilter: "blur(16px)",
              border: sound.custom
                ? "2px solid rgba(34, 197, 94, 0.6)"
                : draggingId === sound.id
                ? "2px solid rgba(255,255,255,0.5)"
                : selectedSoundId === sound.id
                ? "2px solid rgba(139, 92, 246, 0.6)"
                : "2px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              cursor: draggingId ? "grabbing" : "grab",
              left: "calc(50% - 32px)",
              top: "calc(50% - 32px)",
              userSelect: "none",
              touchAction: "none", // Prevents mobile scrolling
              boxShadow: sound.custom
                ? "0 8px 32px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.2)"
                : draggingId === sound.id
                ? "0 8px 32px rgba(255,255,255,0.2)"
                : selectedSoundId === sound.id
                ? "0 8px 32px rgba(139, 92, 246, 0.3)"
                : "0 4px 16px rgba(0,0,0,0.2)"
            }}
            title={sound.custom
              ? `${sound.muted ? "Double-click to unmute" : "Double-click to mute"} • Right-click to remove • Click to adjust volume`
              : `${sound.muted ? "Double-click to unmute" : "Double-click to mute"} • Click to adjust volume`
            }
            whileHover={draggingId !== sound.id ? { scale: 1.1 } : {}}
            whileTap={{ scale: 0.95 }}
          >
            {sound.emoji}
            <AnimatePresence>
              {sound.muted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{
                    position: "absolute",
                    fontSize: "22px",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.3)"
                  }}
                >
                  🔇
                </motion.div>
              )}
            </AnimatePresence>
            {sound.custom && (
              <div style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
                border: "2px solid white",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(34, 197, 94, 0.5)"
              }}>
                ✓
              </div>
            )}

            {/* Volume Slider */}
            <AnimatePresence>
              {selectedSoundId === sound.id && (
                <VolumeSlider
                  soundId={sound.id}
                  emoji={sound.emoji}
                  x={0}
                  y={0}
                  engine={engine}
                  onClose={() => setSelectedSoundId(null)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "12px 24px",
        borderRadius: "24px",
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.8)",
        fontSize: "13px",
        textAlign: "center",
        fontWeight: "500",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        maxWidth: "90vw"
      }}>
        🎯 Drag to move • 🔇 Double-click to mute/unmute • ➕ Add your own sounds
      </div>
    </div>
  )
}
