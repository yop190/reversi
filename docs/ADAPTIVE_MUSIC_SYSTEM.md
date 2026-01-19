# Adaptive Music System

## Overview

The Reversi game features a sophisticated **Adaptive Music System** that creates an immersive audio experience tailored to the game's strategic nature. The music responds dynamically to gameplay, subtly reflecting the player's advantage while maintaining a pleasant, non-distracting atmosphere.

## Musical Style

### Aesthetic Goals
- **Light, playful, and intelligent** - Inspired by Nintendo/Mario-like charm
- **Calm and strategic** - Supports concentration rather than excitement
- **Pleasant and motivating** - Never stressful or aggressive
- **Subtle adaptation** - Changes are felt, not heard abruptly

### Instrumentation
- Soft synthesizers (sine, triangle waves)
- Marimba-like plucked tones
- Light, supportive bass lines
- Minimal rhythmic accents
- Simple, catchy but unobtrusive melodies

### Tempo
- Base tempo: **72 BPM** (calm, strategic pace)
- No aggressive changes
- Slight tempo variations based on game phase

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game Engine                               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │ GameState   │   │ MoveValid.  │   │ Board       │           │
│  │ Service     │──▶│ Service     │──▶│ Component   │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────┐            │
│  │         Advantage Calculator Service            │            │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │            │
│  │  │ Disc     │  │ Corner   │  │ Mobility │      │            │
│  │  │ Diff (DD)│  │ Ctrl (CC)│  │ (MB)     │      │            │
│  │  │ 30%      │  │ 40%      │  │ 20%      │      │            │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │            │
│  │       └─────────────┼─────────────┘            │            │
│  │                     ▼                          │            │
│  │  ┌──────────────────────────────────────┐      │            │
│  │  │     Advantage Score [-1.0, +1.0]     │      │            │
│  │  └──────────────────┬───────────────────┘      │            │
│  │                     │                          │            │
│  │  ┌─────────┐  ┌─────┴─────┐  ┌─────────┐      │            │
│  │  │ Losing  │  │ Neutral   │  │ Winning │      │            │
│  │  │ ≤-0.35  │  │ -0.35~0.35│  │ ≥+0.35  │      │            │
│  │  └─────────┘  └───────────┘  └─────────┘      │            │
│  └─────────────────────┬───────────────────────────┘            │
│                        ▼                                        │
│  ┌─────────────────────────────────────────────────┐            │
│  │           Adaptive Music Service                │            │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐        │            │
│  │  │ Bass    │  │ Harmony │  │ Melody  │        │            │
│  │  │ Layer   │  │ Layer   │  │ Layer   │        │            │
│  │  └────┬────┘  └────┬────┘  └────┬────┘        │            │
│  │       └────────────┼────────────┘              │            │
│  │                    ▼                           │            │
│  │  ┌──────────────────────────────────────┐     │            │
│  │  │          Web Audio API               │     │            │
│  │  │  ┌────────┐  ┌────────┐  ┌────────┐ │     │            │
│  │  │  │Filter  │──│ Master │──│ Dest.  │ │     │            │
│  │  │  │        │  │ Gain   │  │        │ │     │            │
│  │  │  └────────┘  └────────┘  └────────┘ │     │            │
│  │  └──────────────────────────────────────┘     │            │
│  └───────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services

### 1. AdvantageCalculatorService

**Location:** `src/app/services/advantage-calculator.service.ts`

Calculates real-time game advantage for driving music adaptation.

#### Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| Disc Difference (DD) | 30% | `(PlayerDiscs - OpponentDiscs) / TotalDiscs` |
| Corner Control (CC) | 40% | `(PlayerCorners - OpponentCorners) / 4` |
| Mobility (MB) | 20% | `(PlayerMoves - OpponentMoves) / MaxMoves` |

#### Game Phase Modifier

| Phase | Move Range | Modifier | Effect |
|-------|------------|----------|--------|
| Early | 0-20 moves | 0.7x | Reduces disc count impact |
| Mid | 21-44 moves | 1.0x | Balanced |
| Late | 45+ moves | 1.2x | Amplifies disc count |

#### Music States

| State | Threshold | Description |
|-------|-----------|-------------|
| Winning | Score ≥ +0.35 | Brighter, more melodic |
| Neutral | -0.35 < Score < +0.35 | Calm, balanced |
| Losing | Score ≤ -0.35 | Gentler, encouraging |

#### API

```typescript
// Read-only signals
advantageScore: Signal<number>      // [-1.0, +1.0]
musicState: Signal<MusicState>      // 'winning' | 'neutral' | 'losing'
gamePhase: Signal<GamePhase>        // 'early' | 'mid' | 'late'
metrics: Signal<AdvantageMetrics>   // Full metrics object

// Methods
getInterpolationFactor(): number    // 0.0 (losing) to 1.0 (winning)
getIntensityLevel(): number         // 0.0 (balanced) to 1.0 (decisive)
isTenseMoment(): boolean            // Late game with close score
```

---

### 2. AdaptiveMusicService

**Location:** `src/app/services/adaptive-music.service.ts`

The main music controller that generates and plays adaptive music.

#### Game Modes

| Mode | Adaptation Level | Use Case |
|------|-----------------|----------|
| Solo | Full (100%) | Single-player vs AI |
| Multiplayer | Subtle (50%) | Casual online games |
| Competitive | None (0%) | Tournaments |

#### Music Layers

| Layer | Description | Volume |
|-------|-------------|--------|
| Bass | Foundation, slow notes | 80% |
| Harmony | Chord progressions | 60% |
| Melody | Main theme, pentatonic | 70% |
| Rhythm | Marimba-like accents | 40% |
| Accent | Decorative elements | 30% |

#### API

```typescript
// State signals
enabled: Signal<boolean>
gameMode: Signal<GameMode>
masterVolume: Signal<number>
isPlaying: Signal<boolean>
currentMood: Signal<MusicState>

// Control methods
toggleMusic(): void
enableMusic(): void
disableMusic(): void
startMusic(): Promise<void>
stopMusic(): void
pauseMusic(): void
resumeMusic(): void

// Configuration
setGameMode(mode: GameMode): void
setMasterVolume(volume: number): void  // 0.0 to 1.0

// Special effects
playVictoryFanfare(): void
playDefeatSound(): void
forceMood(mood: MusicState): void
```

---

## Components

### MusicToggleComponent

**Location:** `src/app/components/music-toggle/music-toggle.component.ts`

A reusable button for enabling/disabling music.

#### Usage

```html
<!-- Icon only (for toolbars) -->
<app-music-toggle variant="icon"></app-music-toggle>

<!-- Icon with text -->
<app-music-toggle variant="icon-text"></app-music-toggle>

<!-- Emoji button -->
<app-music-toggle variant="emoji"></app-music-toggle>

<!-- Full button with label -->
<app-music-toggle variant="full"></app-music-toggle>
```

#### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| variant | `'icon' \| 'icon-text' \| 'emoji' \| 'full'` | `'icon'` | Button style |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| animated | `boolean` | `true` | Enable hover animation |

---

### MusicSettingsComponent

**Location:** `src/app/components/music-settings/music-settings.component.ts`

Advanced music controls for settings/pause menu.

#### Features

- Music enable/disable toggle
- Master volume slider (0-100%)
- Game mode selector
- Real-time mood indicator with advantage bar
- Advanced layer volume controls (collapsible)

#### Usage

```html
<app-music-settings></app-music-settings>
```

---

## Mode-Specific Behavior

### Solo Mode

```
┌─────────────────────────────────────────────────────┐
│                    SOLO MODE                         │
├─────────────────────────────────────────────────────┤
│  Adaptation: FULL                                    │
│                                                      │
│  Winning State:                                      │
│  • Brighter chord progressions (major keys)         │
│  • More active melody patterns                       │
│  • Slightly higher tempo feel                        │
│  • Additional harmonic layers                        │
│                                                      │
│  Losing State:                                       │
│  • Gentler, encouraging tone (minor keys)           │
│  • Simpler, slower melody                           │
│  • Warmer bass presence                              │
│  • Supportive rather than sad                        │
│                                                      │
│  Purpose: Help learning, maintain enjoyment          │
└─────────────────────────────────────────────────────┘
```

### Multiplayer (Casual) Mode

```
┌─────────────────────────────────────────────────────┐
│                 MULTIPLAYER MODE                     │
├─────────────────────────────────────────────────────┤
│  Adaptation: SUBTLE (50%)                            │
│                                                      │
│  • Reduced intensity range                           │
│  • Less dramatic chord changes                       │
│  • Melody stays mostly neutral                       │
│  • Avoids strong emotional feedback                  │
│                                                      │
│  Purpose: Maintain fairness, comfort for both        │
│           players without revealing game state       │
└─────────────────────────────────────────────────────┘
```

### Competitive / Tournament Mode

```
┌─────────────────────────────────────────────────────┐
│                COMPETITIVE MODE                      │
├─────────────────────────────────────────────────────┤
│  Adaptation: NONE                                    │
│                                                      │
│  • Single neutral loop                               │
│  • Constant tempo and mood                           │
│  • Minimal ambient presence                          │
│  • No advantage-based changes                        │
│                                                      │
│  Purpose: Maximum focus, complete fairness           │
│           No audio cues about game state             │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Web Audio API Architecture

```
Oscillators ──┬──▶ Note Gain ──┬──▶ Lowpass Filter ──▶ Master Gain ──▶ Destination
(per note)    │    (ADSR)      │    (warmth)           (volume)        (speakers)
              │                │
              ├─ Bass Layer    │
              ├─ Harmony Layer │
              ├─ Melody Layer  │
              └─ Rhythm Layer  │
```

### Crossfade System

Mood transitions use **4-second crossfades** to ensure smooth, imperceptible changes:

```
Time:     0s        1s        2s        3s        4s
          ├─────────┼─────────┼─────────┼─────────┤
Current:  100%  ──▶ 75%  ──▶  50%  ──▶  25%  ──▶  0%
Target:   0%   ──▶  25%  ──▶  50%  ──▶  75%  ──▶  100%
```

### Note Frequencies (Pentatonic Scale)

```javascript
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
};
```

### Loop Structure

```
┌────────────────────────────────────────────────────────────┐
│                    2-Bar Phrase (6.67s)                    │
├───────────────────────┬────────────────────────────────────┤
│       Bar 1           │           Bar 2                    │
├───────────────────────┼────────────────────────────────────┤
│ Beat: 1   2   3   4   │   1   2   3   4                   │
│ Bass: ●   .   ●   .   │   ●   .   ●   .                   │
│ Harm: ─────────────── │ ───────────────                   │
│ Melo: ●.●.●.●.●.●.●.● │ ●.●.●.●.●.●.●.●                   │
│ Rhym: ●   ●   ●   ●   │   ●   ●   ●   ●                   │
└───────────────────────┴────────────────────────────────────┘
```

---

## User Settings

### Persistence

Settings are stored in `localStorage`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `reversi-adaptive-music` | boolean | `false` | Music enabled state |
| `reversi-sound` | boolean | `true` | SFX enabled state |

### UI Locations

Music controls are available in:

1. **Main Menu** - Top-right icons
2. **In-Game Header** - Sound and music toggles
3. **Pause Menu** - Full settings component (future)
4. **Game Room** - Multiplayer header

---

## Integration Guide

### Basic Usage

```typescript
// In any component
import { AdaptiveMusicService } from './services/adaptive-music.service';

@Component({ ... })
export class MyComponent {
  private music = inject(AdaptiveMusicService);

  onGameStart(): void {
    this.music.setGameMode(GameMode.Solo);
    this.music.startMusic();
  }

  onGameEnd(won: boolean): void {
    if (won) {
      this.music.playVictoryFanfare();
    } else {
      this.music.playDefeatSound();
    }
  }
}
```

### Custom Mood Override

```typescript
// Force a specific mood (testing or special events)
this.music.forceMood(MusicState.Winning);
```

### Volume Control

```typescript
// Set master volume (0.0 to 1.0)
this.music.setMasterVolume(0.5); // 50% volume
```

---

## Future Enhancements

1. **Audio File Support** - Load real instrument samples
2. **Dynamic Tempo** - Slight BPM variations based on game phase
3. **Per-Layer Volume** - Individual control over each music layer
4. **Theme Selection** - Multiple musical themes to choose from
5. **Sound Design Presets** - Different moods (relaxed, intense, retro)
6. **Spatial Audio** - Position sounds based on board location

---

## Files Structure

```
src/app/
├── services/
│   ├── advantage-calculator.service.ts   # Game advantage calculation
│   ├── adaptive-music.service.ts         # Main music controller
│   └── sound.service.ts                  # SFX + music integration
├── components/
│   ├── music-toggle/
│   │   └── music-toggle.component.ts     # Reusable toggle button
│   └── music-settings/
│       └── music-settings.component.ts   # Advanced settings panel
docs/
└── ADAPTIVE_MUSIC_SYSTEM.md              # This documentation
```

---

## Performance Considerations

- **Oscillator Cleanup**: Oscillators are stopped and removed after use
- **Lazy Initialization**: AudioContext created only on first user interaction
- **Efficient Scheduling**: Uses `setTimeout` for phrase scheduling
- **Memory Management**: Active oscillators array is cleaned periodically
- **Responsive**: Advantage calculation uses Angular signals for reactivity

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best performance |
| Firefox | ✅ Full | Good support |
| Safari | ✅ Full | Requires user interaction |
| Edge | ✅ Full | Chromium-based |
| Mobile | ✅ Partial | May require touch to start |

---

*Last updated: January 2026*
