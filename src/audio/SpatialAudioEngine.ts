export type SoundNodeChain = {
  source: AudioBufferSourceNode
  gain: GainNode
  panner: PannerNode
  filter: BiquadFilterNode
  sendGain: GainNode
  baseGain: number // Store the base gain level for unmuting
}

export type EffectType = 'reverb' | 'delay'

export interface RoomConfig {
  width: number
  depth: number
  wallReflection: number
  ceilingHeight: number
}

export class SpatialAudioEngine {
  private ctx = new AudioContext()
  private masterGain = this.ctx.createGain()
  private analyser = this.ctx.createAnalyser()
  private masterLowpass = this.ctx.createBiquadFilter()
  private sounds = new Map<string, SoundNodeChain>()
  private buffers = new Map<string, AudioBuffer>()
  private mutedSounds = new Set<string>()
  private effectsSendGain = 0.8 // Increased from 0.3 for more noticeable effects

  // Effect nodes
  private reverbGain: GainNode
  private reverbConvolver: ConvolverNode
  private delayGain: GainNode
  private delayNode: DelayNode
  private delayFeedback: GainNode

  // Room acoustics
  private roomConfig: RoomConfig = {
    width: 20,
    depth: 20,
    wallReflection: 0.3,
    ceilingHeight: 3,
  }

  constructor() {
    this.masterLowpass.type = "lowpass"
    this.masterLowpass.frequency.value = 18000

    this.analyser.fftSize = 512

    // Setup reverb
    this.reverbConvolver = this.ctx.createConvolver()
    this.reverbGain = this.ctx.createGain()
    this.reverbGain.gain.value = 0

    // Setup delay
    this.delayNode = this.ctx.createDelay(1.0)
    this.delayNode.delayTime.value = 0.3
    this.delayFeedback = this.ctx.createGain()
    this.delayFeedback.gain.value = 0.4
    this.delayGain = this.ctx.createGain()
    this.delayGain.gain.value = 0

    // Create impulse response for reverb
    this.createImpulseResponse()

    // Connect delay feedback loop
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode)

    // Connect effects to master
    this.reverbConvolver.connect(this.reverbGain)
    this.delayNode.connect(this.delayGain)
    this.reverbGain.connect(this.masterGain)
    this.delayGain.connect(this.masterGain)

    // Main signal chain
    this.masterGain.connect(this.masterLowpass)
    this.masterLowpass.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
  }

  private createImpulseResponse() {
    const sampleRate = this.ctx.sampleRate
    const length = sampleRate * 2 // 2 seconds
    const impulse = this.ctx.createBuffer(2, length, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        // Exponential decay with random noise for natural reverb
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }

    this.reverbConvolver.buffer = impulse
  }

  getAnalyser() {
    return this.analyser
  }

  async loadSound(id: string, url: string) {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const audio = await this.ctx.decodeAudioData(buf)
    this.buffers.set(id, audio)
  }

  async loadSoundFromFile(id: string, file: File) {
    const arrayBuffer = await file.arrayBuffer()
    const audio = await this.ctx.decodeAudioData(arrayBuffer)
    this.buffers.set(id, audio)
  }

  playSound(id: string) {
    const buffer = this.buffers.get(id)
    if (!buffer) return

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = this.ctx.createGain()
    const panner = this.ctx.createPanner()
    const filter = this.ctx.createBiquadFilter()
    const sendGain = this.ctx.createGain()

    panner.panningModel = "HRTF"
    panner.distanceModel = "exponential"
    panner.refDistance = 1
    panner.maxDistance = 20
    panner.rolloffFactor = 1

    filter.type = "lowpass"
    filter.frequency.value = 12000
    sendGain.gain.value = this.effectsSendGain
    gain.gain.value = 1.0 // Initial gain

    // Connect dry signal
    source.connect(gain).connect(panner).connect(filter).connect(this.masterGain)

    // Connect to effects sends
    filter.connect(sendGain)
    sendGain.connect(this.reverbConvolver)
    sendGain.connect(this.delayNode)

    source.start()

    this.sounds.set(id, { source, gain, panner, filter, sendGain, baseGain: 1.0 })
  }

  stopSound(id: string) {
    const sound = this.sounds.get(id)
    if (!sound) return

    const now = this.ctx.currentTime
    sound.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    setTimeout(() => {
      sound.source.stop()
      this.sounds.delete(id)
    }, 500)
  }

  setMute(id: string, muted: boolean) {
    const sound = this.sounds.get(id)
    if (!sound) return

    const now = this.ctx.currentTime
    if (muted) {
      // Add to muted set
      this.mutedSounds.add(id)
      // Store current gain and set to 0
      sound.baseGain = sound.gain.gain.value
      sound.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    } else {
      // Remove from muted set
      this.mutedSounds.delete(id)
      // Restore the base gain
      sound.gain.gain.exponentialRampToValueAtTime(Math.max(0.1, sound.baseGain), now + 0.1)
    }
  }

  isMuted(id: string): boolean {
    return this.mutedSounds.has(id)
  }

  setSoundVolume(id: string, volume: number) {
    const sound = this.sounds.get(id)
    if (!sound) return

    // Update base gain which is used in updatePosition
    sound.baseGain = volume

    // If not muted and not being dragged, apply immediately
    if (!this.mutedSounds.has(id)) {
      const now = this.ctx.currentTime
      sound.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.1)
    }
  }

  getSoundVolume(id: string): number {
    const sound = this.sounds.get(id)
    if (!sound) return 0.5
    return sound.baseGain
  }

  /**
   * Update sound position with improved physics:
   * - Distance-based volume attenuation (inverse square law)
   * - Distance-based filtering (air absorption)
   * - Wall reflections (calculate distance to walls)
   * - Position-based reverb (more reverb when further from center)
   */
  updatePosition(id: string, x: number, y: number) {
    const sound = this.sounds.get(id)
    if (!sound) return
    const now = this.ctx.currentTime

    // Update 3D position
    sound.panner.positionX.exponentialRampToValueAtTime(x, now + 0.05)
    sound.panner.positionZ.exponentialRampToValueAtTime(y, now + 0.05)

    // Calculate distance from center (listener position)
    const distance = Math.sqrt(x * x + y * y)

    // Physics: Inverse square law for volume attenuation
    // Minimum volume of 0.1, max of 1.0
    const volume = Math.max(0.1, 1 / (1 + distance * 0.3))

    // Physics: Air absorption - higher frequencies are attenuated more with distance
    const cutoffFreq = Math.max(600, 15000 - distance * 1200)

    // Physics: Calculate wall reflections
    const { width, depth } = this.roomConfig
    const distToLeft = Math.abs(x + width / 2)
    const distToRight = Math.abs(x - width / 2)
    const distToFront = Math.abs(y + depth / 2)
    const distToBack = Math.abs(y - depth / 2)

    const minWallDistance = Math.min(distToLeft, distToRight, distToFront, distToBack)

    // Increase reverb when closer to walls (sound reflects off walls)
    const wallReverbBoost = Math.max(0, 1 - minWallDistance / 5) * this.roomConfig.wallReflection

    // Store the calculated volume in baseGain for use when unmuting
    sound.baseGain = volume

    // Apply all physics calculations (except gain if muted)
    if (!this.mutedSounds.has(id)) {
      sound.gain.gain.exponentialRampToValueAtTime(volume, now + 0.05)
    }
    sound.filter.frequency.exponentialRampToValueAtTime(cutoffFreq, now + 0.05)
    sound.sendGain.gain.exponentialRampToValueAtTime(this.effectsSendGain + wallReverbBoost, now + 0.1)
  }

  toggleLofi(on: boolean) {
    this.masterLowpass.frequency.setValueAtTime(on ? 2000 : 18000, this.ctx.currentTime)
  }

  setEffectAmount(effect: EffectType, value: number) {
    const now = this.ctx.currentTime

    // Multiply by 2.0 for more noticeable effects (max gain is 2.0 instead of 1.0)
    if (effect === 'reverb') {
      this.reverbGain.gain.exponentialRampToValueAtTime(Math.max(0.001, value * 2.0), now + 0.1)
    } else if (effect === 'delay') {
      this.delayGain.gain.exponentialRampToValueAtTime(Math.max(0.001, value * 2.0), now + 0.1)
    }
  }

  setDelayTime(time: number) {
    this.delayNode.delayTime.exponentialRampToValueAtTime(time, this.ctx.currentTime + 0.1)
  }

  setDelayFeedback(feedback: number) {
    this.delayFeedback.gain.exponentialRampToValueAtTime(feedback, this.ctx.currentTime + 0.1)
  }

  getEffectAmount(effect: EffectType): number {
    if (effect === 'reverb') {
      return this.reverbGain.gain.value
    } else {
      return this.delayGain.gain.value
    }
  }

  setRoomConfig(config: Partial<RoomConfig>) {
    this.roomConfig = { ...this.roomConfig, ...config }
  }

  getRoomConfig(): RoomConfig {
    return { ...this.roomConfig }
  }

  isPlaying(id: string): boolean {
    return this.sounds.has(id)
  }

  getLoadedSounds(): string[] {
    return Array.from(this.buffers.keys())
  }

  async resumeContext() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }
}
