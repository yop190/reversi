/**
 * Adaptive Music Service
 * A sophisticated music system for Reversi with layered, mood-adaptive audio
 * 
 * Features:
 * - Loop-based modular music with separate layers (bass, harmony, melody, rhythm)
 * - Smooth crossfading between musical states
 * - Mode-specific behavior (Solo, Multiplayer, Competitive)
 * - Real-time adaptation based on game advantage
 * - Nintendo-inspired, light and playful aesthetic
 * 
 * Musical Style:
 * - Light, playful, and intelligent
 * - Soft synths, marimba-like tones, light bass
 * - Minimal percussion, catchy but unobtrusive melodies
 * - Slow to medium tempo, never aggressive
 */

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AdvantageCalculatorService, MusicState, GamePhase } from './advantage-calculator.service';

/**
 * Game mode affects how music adapts to gameplay
 */
export enum GameMode {
  Solo = 'solo',           // Full adaptive music, encouraging feedback
  Multiplayer = 'multiplayer', // Subtle adaptation, reduced intensity
  Competitive = 'competitive'  // No adaptation, single neutral loop
}

/**
 * Music layer types for modular composition
 */
export enum MusicLayer {
  Bass = 'bass',
  Harmony = 'harmony',
  Melody = 'melody',
  Rhythm = 'rhythm',
  Accent = 'accent'
}

/**
 * Audio layer configuration
 */
interface LayerConfig {
  enabled: boolean;
  volume: number;
  oscillatorType: OscillatorType;
  frequencies: number[];
  pattern: number[];  // Rhythm pattern (1 = play, 0 = rest)
}

/**
 * Music state configuration for each mood
 */
interface MoodConfig {
  baseFrequency: number;
  tempoMultiplier: number;
  layers: Record<MusicLayer, LayerConfig>;
  filterFrequency: number;
  filterQ: number;
}

// Musical constants
const BASE_TEMPO = 72; // BPM - calm and strategic
const BEAT_DURATION = 60 / BASE_TEMPO; // Duration of one beat in seconds
const BAR_DURATION = BEAT_DURATION * 4; // 4/4 time signature

// Note frequencies (Nintendo-inspired bright pentatonic scale)
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50
};

// Chord progressions for each mood (pentatonic-based, Nintendo-like)
const CHORD_PROGRESSIONS = {
  neutral: [
    [NOTES.C4, NOTES.E4, NOTES.G4],      // C major
    [NOTES.A3, NOTES.C4, NOTES.E4],      // A minor
    [NOTES.G3, NOTES.D4, NOTES.G4],      // G sus
    [NOTES.C4, NOTES.E4, NOTES.G4],      // C major
  ],
  winning: [
    [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5],  // C major (bright)
    [NOTES.D4, NOTES.G4, NOTES.A4],            // G/D
    [NOTES.E4, NOTES.G4, NOTES.C5],            // C/E
    [NOTES.G4, NOTES.C5, NOTES.E5],            // C high
  ],
  losing: [
    [NOTES.A3, NOTES.C4, NOTES.E4],      // A minor
    [NOTES.G3, NOTES.C4, NOTES.E4],      // C/G
    [NOTES.D3, NOTES.A3, NOTES.D4],      // D minor
    [NOTES.A3, NOTES.C4, NOTES.E4],      // A minor
  ]
};

// Melody patterns for each mood - VERY DISTINCT patterns
const MELODY_PATTERNS = {
  neutral: [
    NOTES.C5, 0, NOTES.E5, 0, NOTES.G5, 0, NOTES.E5, 0,
    NOTES.D5, 0, NOTES.C5, 0, NOTES.A4, 0, 0, 0
  ],
  winning: [
    NOTES.G5, NOTES.C6, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.G5, NOTES.E5, NOTES.C5,
    NOTES.D5, NOTES.G5, NOTES.C6, NOTES.G5, NOTES.E5, NOTES.G5, NOTES.C6, 0
  ],
  losing: [
    NOTES.A4, 0, 0, 0, NOTES.E4, 0, 0, 0,
    NOTES.D4, 0, 0, NOTES.C4, 0, 0, 0, 0
  ]
};

// Bass patterns - DISTINCT for each mood
const BASS_PATTERNS = {
  neutral: [NOTES.C3, 0, 0, 0, NOTES.G3, 0, 0, 0],
  winning: [NOTES.C3, NOTES.G3, NOTES.C3, 0, NOTES.G3, NOTES.C3, NOTES.G3, 0],  // Active, energetic
  losing: [NOTES.A3, 0, 0, 0, 0, 0, 0, 0]  // Sparse, slower
};

@Injectable({
  providedIn: 'root'
})
export class AdaptiveMusicService {
  private advantageCalculator = inject(AdvantageCalculatorService);

  // Audio context and nodes
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  
  // Active oscillators and scheduled events
  private activeOscillators: OscillatorNode[] = [];
  private scheduledTimeouts: number[] = [];
  private loopInterval: number | null = null;
  
  // State signals
  // Default to false - music only starts after user explicitly enables it
  private _enabled = signal(false);
  private _gameMode = signal<GameMode>(GameMode.Solo);
  private _masterVolume = signal(0.15); // Default master volume
  private _isPlaying = signal(false);
  private _hasUserInteracted = signal(false);
  private _currentMood = signal<MusicState>(MusicState.Neutral);
  private _targetMood = signal<MusicState>(MusicState.Neutral);
  
  // Layer states
  private _layerVolumes = signal<Record<MusicLayer, number>>({
    [MusicLayer.Bass]: 0.8,
    [MusicLayer.Harmony]: 0.6,
    [MusicLayer.Melody]: 0.7,
    [MusicLayer.Rhythm]: 0.4,
    [MusicLayer.Accent]: 0.3
  });

  // Crossfade progress (0 = current mood, 1 = target mood)
  private crossfadeProgress = 0;
  private crossfadeStartTime = 0;
  private readonly CROSSFADE_DURATION = 1.5; // Faster transition for noticeable change

  // Public readonly signals
  readonly enabled = this._enabled.asReadonly();
  readonly gameMode = this._gameMode.asReadonly();
  readonly masterVolume = this._masterVolume.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly currentMood = computed(() => this._currentMood());

  constructor() {
    // Set up effect to react to advantage changes
    effect(() => {
      const musicState = this.advantageCalculator.musicState();
      if (this._enabled() && this._isPlaying()) {
        this.updateTargetMood(musicState);
      }
    });
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this._masterVolume();
        
        // Create lowpass filter for warmth and mood control
        this.lowpassFilter = this.audioContext.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.value = 2000;
        this.lowpassFilter.Q.value = 0.5;
        
        // Connect chain: sources -> filter -> master gain -> destination
        this.lowpassFilter.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
      }
    }
  }

  /**
   * Resume audio context if suspended
   */
  private async resumeContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Toggle music on/off
   * First toggle initializes AudioContext (requires user gesture)
   */
  toggleMusic(): void {
    // Mark that user has interacted (unlocks AudioContext)
    this._hasUserInteracted.set(true);
    
    const newValue = !this._enabled();
    this._enabled.set(newValue);
    this.saveMusicPreference(newValue);
    
    if (newValue) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  /**
   * Enable music
   */
  enableMusic(): void {
    if (!this._enabled()) {
      this._enabled.set(true);
      this.saveMusicPreference(true);
      this.startMusic();
    }
  }

  /**
   * Disable music
   */
  disableMusic(): void {
    if (this._enabled()) {
      this._enabled.set(false);
      this.saveMusicPreference(false);
      this.stopMusic();
    }
  }

  /**
   * Set game mode (affects music adaptation behavior)
   */
  setGameMode(mode: GameMode): void {
    this._gameMode.set(mode);
    
    // Adjust music behavior based on mode
    switch (mode) {
      case GameMode.Solo:
        // Full adaptation
        break;
      case GameMode.Multiplayer:
        // Reduced adaptation intensity
        break;
      case GameMode.Competitive:
        // Force neutral mood, no adaptation
        this._targetMood.set(MusicState.Neutral);
        this._currentMood.set(MusicState.Neutral);
        break;
    }
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this._masterVolume.set(clampedVolume);
    
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setTargetAtTime(
        clampedVolume,
        this.audioContext.currentTime,
        0.1
      );
    }
  }

  /**
   * Set individual layer volume (0.0 to 1.0)
   */
  setLayerVolume(layer: MusicLayer, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this._layerVolumes.update(volumes => ({
      ...volumes,
      [layer]: clampedVolume
    }));
  }

  /**
   * Get layer volumes (readonly)
   */
  readonly layerVolumes = computed(() => this._layerVolumes());

  /**
   * Start playing music
   * @param force - If true, starts even without prior user interaction (for auto-resume)
   */
  async startMusic(force = false): Promise<void> {
    // Only start if enabled and user has interacted (AudioContext policy)
    if (!this._enabled()) return;
    if (this._isPlaying()) return;
    if (!force && !this._hasUserInteracted()) {
      // AudioContext requires user gesture - will start on first toggle
      return;
    }
    
    this.initAudioContext();
    if (!this.audioContext) return;
    
    await this.resumeContext();
    
    this._isPlaying.set(true);
    this.crossfadeProgress = 1; // Start at current mood fully
    this._currentMood.set(this.advantageCalculator.musicState());
    this._targetMood.set(this._currentMood());
    
    // Start the music loop
    this.startMusicLoop();
  }

  /**
   * Stop playing music
   */
  stopMusic(): void {
    this._isPlaying.set(false);
    
    // Clear loop interval
    if (this.loopInterval !== null) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    
    // Clear scheduled events
    this.scheduledTimeouts.forEach(id => clearTimeout(id));
    this.scheduledTimeouts = [];
    
    // Stop all oscillators with fade out
    this.stopAllOscillators(true);
  }

  /**
   * Pause music (keeps state for resuming)
   */
  pauseMusic(): void {
    if (this._isPlaying()) {
      this.stopMusic();
    }
  }

  /**
   * Resume music
   */
  resumeMusic(): void {
    if (this._enabled() && !this._isPlaying()) {
      this.startMusic();
    }
  }

  /**
   * Force a specific mood (useful for testing or special events)
   */
  forceMood(mood: MusicState): void {
    this._targetMood.set(mood);
  }

  /**
   * Play a victory fanfare
   */
  playVictoryFanfare(): void {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;
    
    // Temporarily pause regular music
    const wasPlaying = this._isPlaying();
    this.stopMusic();
    
    // Mario-inspired victory melody
    const melody = [
      { note: NOTES.C5, start: 0, duration: 0.15 },
      { note: NOTES.E5, start: 0.12, duration: 0.15 },
      { note: NOTES.G5, start: 0.24, duration: 0.15 },
      { note: NOTES.C6, start: 0.36, duration: 0.4 },
      { note: NOTES.G5, start: 0.7, duration: 0.15 },
      { note: NOTES.C6, start: 0.85, duration: 0.5 },
    ];
    
    melody.forEach(({ note, start, duration }) => {
      this.playNote(note, start, duration, 0.25, 'triangle');
    });
    
    // Resume music after fanfare
    if (wasPlaying) {
      setTimeout(() => this.startMusic(), 1500);
    }
  }

  /**
   * Play a defeat sound
   */
  playDefeatSound(): void {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;
    
    const wasPlaying = this._isPlaying();
    this.stopMusic();
    
    // Gentle descending phrase
    const melody = [
      { note: NOTES.E5, start: 0, duration: 0.3 },
      { note: NOTES.D5, start: 0.25, duration: 0.3 },
      { note: NOTES.C5, start: 0.5, duration: 0.3 },
      { note: NOTES.A4, start: 0.75, duration: 0.5 },
    ];
    
    melody.forEach(({ note, start, duration }) => {
      this.playNote(note, start, duration, 0.15, 'sine');
    });
    
    if (wasPlaying) {
      setTimeout(() => this.startMusic(), 1500);
    }
  }

  // ============================================================
  // MUSIC GENERATION
  // ============================================================

  /**
   * Start the main music loop
   */
  private startMusicLoop(): void {
    if (!this.audioContext) return;
    
    // Play initial phrase
    this.playMusicalPhrase();
    
    // Schedule next phrases
    const loopDuration = BAR_DURATION * 2 * 1000; // 2 bars per phrase
    this.loopInterval = window.setInterval(() => {
      if (this._isPlaying()) {
        this.updateCrossfade();
        this.playMusicalPhrase();
      }
    }, loopDuration);
  }

  /**
   * Play a complete musical phrase (2 bars)
   */
  private playMusicalPhrase(): void {
    if (!this.audioContext || !this._isPlaying()) return;
    
    const mood = this.getInterpolatedMood();
    const gameMode = this._gameMode();
    
    // In competitive mode, always play neutral with reduced intensity
    if (gameMode === GameMode.Competitive) {
      this.playNeutralPhrase(0.6);
      return;
    }
    
    // Get adaptation intensity based on mode
    const intensity = gameMode === GameMode.Multiplayer ? 0.5 : 1.0;
    
    // Play layers based on mood
    this.playBassLayer(mood, intensity);
    this.playHarmonyLayer(mood, intensity);
    this.playMelodyLayer(mood, intensity);
    
    // Add rhythm accents in solo mode
    if (gameMode === GameMode.Solo) {
      this.playRhythmLayer(mood, intensity);
    }
  }

  /**
   * Play a neutral phrase (for competitive mode)
   */
  private playNeutralPhrase(intensity: number): void {
    const mood: InterpolatedMood = {
      state: MusicState.Neutral,
      winningInfluence: 0,
      losingInfluence: 0,
      intensity: intensity
    };
    
    this.playBassLayer(mood, intensity);
    this.playHarmonyLayer(mood, intensity * 0.8);
    this.playMelodyLayer(mood, intensity * 0.5);
  }

  /**
   * Play the bass layer
   */
  private playBassLayer(mood: InterpolatedMood, intensity: number): void {
    if (!this.audioContext) return;
    
    const layerVolume = this._layerVolumes()[MusicLayer.Bass] * intensity * 0.3;
    const pattern = this.getInterpolatedPattern(
      BASS_PATTERNS.neutral,
      BASS_PATTERNS.winning,
      BASS_PATTERNS.losing,
      mood
    );
    
    pattern.forEach((note, index) => {
      if (note > 0) {
        const startTime = (index / pattern.length) * BAR_DURATION * 2;
        this.playNote(note, startTime, BEAT_DURATION * 0.8, layerVolume, 'sine');
      }
    });
  }

  /**
   * Play the harmony layer (chords)
   */
  private playHarmonyLayer(mood: InterpolatedMood, intensity: number): void {
    if (!this.audioContext) return;
    
    const layerVolume = this._layerVolumes()[MusicLayer.Harmony] * intensity * 0.15;
    const progression = this.getChordProgression(mood);
    
    progression.forEach((chord, index) => {
      const startTime = index * BAR_DURATION / 2;
      this.playChord(chord, startTime, BAR_DURATION / 2 * 0.9, layerVolume);
    });
  }

  /**
   * Play the melody layer
   */
  private playMelodyLayer(mood: InterpolatedMood, intensity: number): void {
    if (!this.audioContext) return;
    
    const layerVolume = this._layerVolumes()[MusicLayer.Melody] * intensity * 0.2;
    const pattern = this.getInterpolatedPattern(
      MELODY_PATTERNS.neutral,
      MELODY_PATTERNS.winning,
      MELODY_PATTERNS.losing,
      mood
    );
    
    const noteLength = (BAR_DURATION * 2) / pattern.length;
    
    pattern.forEach((note, index) => {
      if (note > 0) {
        const startTime = index * noteLength;
        this.playNote(note, startTime, noteLength * 0.7, layerVolume, 'triangle');
      }
    });
  }

  /**
   * Play rhythm layer (subtle percussion-like accents)
   */
  private playRhythmLayer(mood: InterpolatedMood, intensity: number): void {
    if (!this.audioContext) return;
    
    const layerVolume = this._layerVolumes()[MusicLayer.Rhythm] * intensity * 0.08;
    
    // Marimba-like percussive accents on beats
    const beats = [0, 2, 4, 6]; // Every other beat
    const beatLength = BEAT_DURATION;
    
    beats.forEach(beat => {
      const startTime = beat * beatLength;
      // Higher pitched click
      this.playNote(NOTES.C6, startTime, 0.05, layerVolume * 0.5, 'sine');
      // Lower body
      this.playNote(NOTES.G4, startTime, 0.1, layerVolume, 'triangle');
    });
  }

  // ============================================================
  // AUDIO UTILITIES
  // ============================================================

  /**
   * Play a single note
   */
  private playNote(
    frequency: number,
    startOffset: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.audioContext || !this.lowpassFilter) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    // Add slight detune for warmth
    osc.detune.value = (Math.random() - 0.5) * 10;
    
    osc.connect(gain);
    gain.connect(this.lowpassFilter);
    
    const startTime = this.audioContext.currentTime + startOffset;
    const attackTime = Math.min(0.02, duration * 0.1);
    const releaseTime = Math.min(0.1, duration * 0.3);
    
    // ADSR envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gain.gain.setValueAtTime(volume * 0.8, startTime + duration - releaseTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    
    this.activeOscillators.push(osc);
    
    // Clean up oscillator after it stops
    const cleanupId = window.setTimeout(() => {
      const index = this.activeOscillators.indexOf(osc);
      if (index > -1) {
        this.activeOscillators.splice(index, 1);
      }
    }, (startOffset + duration + 0.2) * 1000);
    
    this.scheduledTimeouts.push(cleanupId);
  }

  /**
   * Play a chord (multiple notes)
   */
  private playChord(
    frequencies: number[],
    startOffset: number,
    duration: number,
    volumePerNote: number
  ): void {
    frequencies.forEach((freq, index) => {
      // Slight stagger for natural feel
      const stagger = index * 0.015;
      this.playNote(freq, startOffset + stagger, duration, volumePerNote, 'sine');
    });
  }

  /**
   * Stop all active oscillators
   */
  private stopAllOscillators(fade: boolean = true): void {
    if (!this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    const fadeTime = fade ? 0.5 : 0;
    
    this.activeOscillators.forEach(osc => {
      try {
        if (fade) {
          // Fade out
          const gain = osc.connect(this.audioContext!.createGain());
          // Already connected, just stop
        }
        osc.stop(currentTime + fadeTime);
      } catch (e) {
        // Oscillator may already be stopped
      }
    });
    
    this.activeOscillators = [];
  }

  // ============================================================
  // MOOD INTERPOLATION
  // ============================================================

  /**
   * Update lowpass filter frequency based on mood for noticeable tonal change
   * - Winning: Higher frequency (3500Hz) = brighter, more energetic sound
   * - Neutral: Medium frequency (2000Hz) = balanced sound
   * - Losing: Lower frequency (800Hz) = warmer, more subdued sound
   */
  private updateFilterForMood(advantageScore: number): void {
    if (!this.lowpassFilter || !this.audioContext) return;
    
    // Map advantage score (-1 to 1) to filter frequency (800 to 3500 Hz)
    // Using exponential scaling for more musical result
    const minFreq = 800;
    const maxFreq = 3500;
    const normalizedScore = (advantageScore + 1) / 2; // 0 to 1
    const targetFreq = minFreq + (maxFreq - minFreq) * normalizedScore;
    
    // Smooth transition to new frequency
    const currentTime = this.audioContext.currentTime;
    this.lowpassFilter.frequency.cancelScheduledValues(currentTime);
    this.lowpassFilter.frequency.setValueAtTime(this.lowpassFilter.frequency.value, currentTime);
    this.lowpassFilter.frequency.linearRampToValueAtTime(targetFreq, currentTime + 0.3);
    
    // Also adjust Q for more dramatic effect when winning (slightly resonant)
    const targetQ = 0.5 + (normalizedScore * 1.5); // 0.5 to 2.0
    this.lowpassFilter.Q.cancelScheduledValues(currentTime);
    this.lowpassFilter.Q.setValueAtTime(this.lowpassFilter.Q.value, currentTime);
    this.lowpassFilter.Q.linearRampToValueAtTime(targetQ, currentTime + 0.3);
  }

  /**
   * Get interpolated mood based on crossfade progress
   */
  private getInterpolatedMood(): InterpolatedMood {
    const advantageScore = this.advantageCalculator.advantageScore();
    const absScore = Math.abs(advantageScore);
    
    // Calculate winning and losing influences (0 to 1)
    const winningInfluence = Math.max(0, advantageScore);
    const losingInfluence = Math.max(0, -advantageScore);
    
    // Update filter based on mood for more noticeable change
    this.updateFilterForMood(advantageScore);
    
    // Determine primary state (using lower thresholds)
    let state = MusicState.Neutral;
    if (advantageScore >= 0.15) {
      state = MusicState.Winning;
    } else if (advantageScore <= -0.15) {
      state = MusicState.Losing;
    }
    
    return {
      state,
      winningInfluence,
      losingInfluence,
      intensity: absScore
    };
  }

  /**
   * Update target mood based on music state
   */
  private updateTargetMood(newMood: MusicState): void {
    if (this._gameMode() === GameMode.Competitive) {
      return; // Don't adapt in competitive mode
    }
    
    if (this._targetMood() !== newMood) {
      this._targetMood.set(newMood);
      this.crossfadeProgress = 0;
      this.crossfadeStartTime = this.audioContext?.currentTime || 0;
    }
  }

  /**
   * Update crossfade progress
   */
  private updateCrossfade(): void {
    if (this.crossfadeProgress >= 1) return;
    if (!this.audioContext) return;
    
    const elapsed = this.audioContext.currentTime - this.crossfadeStartTime;
    this.crossfadeProgress = Math.min(1, elapsed / this.CROSSFADE_DURATION);
    
    if (this.crossfadeProgress >= 1) {
      this._currentMood.set(this._targetMood());
    }
  }

  /**
   * Get interpolated pattern between moods
   */
  private getInterpolatedPattern(
    neutral: number[],
    winning: number[],
    losing: number[],
    mood: InterpolatedMood
  ): number[] {
    // For simplicity, select pattern based on primary mood
    // Could be extended to blend patterns
    switch (mood.state) {
      case MusicState.Winning:
        return winning;
      case MusicState.Losing:
        return losing;
      default:
        return neutral;
    }
  }

  /**
   * Get chord progression based on mood
   */
  private getChordProgression(mood: InterpolatedMood): number[][] {
    switch (mood.state) {
      case MusicState.Winning:
        return CHORD_PROGRESSIONS.winning;
      case MusicState.Losing:
        return CHORD_PROGRESSIONS.losing;
      default:
        return CHORD_PROGRESSIONS.neutral;
    }
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

  /**
   * Load music preference from localStorage
   */
  private loadMusicPreference(): boolean {
    try {
      const saved = localStorage.getItem('reversi-adaptive-music');
      return saved === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Save music preference to localStorage
   */
  private saveMusicPreference(enabled: boolean): void {
    try {
      localStorage.setItem('reversi-adaptive-music', String(enabled));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Interpolated mood interface (needs to be outside class for TypeScript)
 */
interface InterpolatedMood {
  state: MusicState;
  winningInfluence: number;
  losingInfluence: number;
  intensity: number;
}
