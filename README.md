# 🎵 Lofi Flow

A physics-based audio mixer where you position sounds in a virtual 3D space instead of using traditional sliders. Move objects closer or further to control volume, and experience real-time spatial audio with realistic room acoustics.

![Lofi Flow](https://img.shields.io/badge/React-18.3-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.182-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## ✨ Features

- **🎮 2D & 🌐 3D Views** - Toggle between simple 2D interface and immersive 3D room
- **🎧 Spatial Audio** - Real-time HRTF-based 3D audio positioning
- **🌊 Effects** - Reverb and delay with adjustable parameters
- **📚 Presets** - One-click soundscapes (Cozy Rain, Coffee Shop, Late Night, etc.)
- **🏠 Room Acoustics** - Adjustable room size and wall reflections
- **🎵 Lofi Mode** - Warm low-pass filter for that vintage feel
- **⚡ Physics-Based** - Inverse square law, air absorption, wall reflections

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**

### How to Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/skdey-00/Vibescape-WhiteNoise.git
   cd Vibescape-WhiteNoise
   ```

2. **Install dependencies** (only needed once):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: The terminal will show a local URL (typically `http://localhost:3000`). Open that URL in your web browser.

5. **Start mixing!** Drag the sound icons around to position them in space.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory. You can then deploy it to any static hosting service.

## 🎯 How to Use

1. **Drag Sound Icons** - Move the emoji icons around the space to position sounds
2. **Toggle Effects** - Click the ✨ Effects button to add reverb and delay
3. **Apply Presets** - Click 📚 Presets for instant soundscapes
4. **Adjust Room** - Click 🏠 Room to change room acoustics
5. **Switch Views** - Toggle between 2D and 3D views
6. **Lofi Mode** - Click 🎵 Lofi for warm, filtered sound

## 🎨 Controls

| Control | Action |
|---------|--------|
| Drag icons | Move sounds in space |
| Click 3D objects | Select/drag in 3D view |
| Double-click 3D objects | Toggle sound on/off |
| Scroll | Zoom (in 3D view) |
| Drag background | Rotate camera (in 3D view) |

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Three.js + React Three Fiber** - 3D rendering
- **Framer Motion** - Smooth animations
- **Web Audio API** - Real-time audio processing
- **Vite** - Build tool
- **Tailwind CSS** - Styling

## 📁 Project Structure

```
src/
├── audio/
│   └── SpatialAudioEngine.ts    # Core audio engine with physics
├── components/
│   ├── DraggableSoundIcon.tsx   # 2D sound icons
│   ├── Room3D.tsx               # 3D room view
│   ├── SoundObject3D.tsx        # 3D sound objects
│   ├── EffectsPanel.tsx         # Effects controls
│   ├── PresetPanel.tsx          # Preset selector
│   └── RoomSettingsPanel.tsx    # Room acoustics
├── lib/
│   └── presets.ts               # Sound preset configurations
├── hooks/
│   └── useAudioPulse.ts         # Audio visualization hook
└── App.tsx                      # Main application
```

## 🌐 Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Deploy the dist/ folder
```

### GitHub Pages

```bash
npm run build
# Push dist/ folder to gh-pages branch
```

## 🎵 Sounds

The app includes three default sounds:
- 🌧️ Rain - Rain sounds
- ☕ Cafe - Coffee shop ambience
- 📀 Vinyl - Vinyl crackle and music

Add more sounds by placing MP3 files in `public/sounds/` and loading them in `App.tsx`.

## 🔧 Customization

### Adding New Sounds

```typescript
// In App.tsx
useEffect(() => {
  engine.loadSound("thunder", "/sounds/thunder.mp3").then(() => engine.playSound("thunder"))
}, [])

// Add to SOUND_CONFIG
{ id: "thunder", emoji: "⛈️", position: [0, 1, 0] as [number, number, number] }
```

### Creating Presets

```typescript
// In lib/presets.ts
{
  id: "my-preset",
  name: "My Preset",
  emoji: "🎵",
  description: "Custom soundscape",
  sounds: [
    { id: "rain", position: [x, y], volume: 0.8 },
  ],
  effects: { reverb: 0.3, delay: 0.1, delayTime: 0.3, delayFeedback: 0.4 },
  lofi: true,
}
```

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new sound effects
- Create presets
- Improve physics calculations
- Add new features

---

Made with 🎵 and code
