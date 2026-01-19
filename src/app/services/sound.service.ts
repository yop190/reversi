/**
 * Sound Service
 * Handles audio effects for game events
 * User can enable/disable sounds via settings
 * 
 * NOTE: For adaptive music, use AdaptiveMusicService instead.
 * This service maintains the basic music toggle for backward compatibility
 * but delegates to AdaptiveMusicService for actual music playback.
 */

import { Injectable, signal, inject } from '@angular/core';

export type SoundType = 'move' | 'capture' | 'win' | 'lose' | 'draw' | 'invalid' | 'leaderboard';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private audioContext: AudioContext | null = null;
  private _enabled = signal(this.loadSoundPreference());
  private _musicEnabled = signal(this.loadMusicPreference());
  private musicGainNode: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicInterval: any = null;
  private currentMood: 'neutral' | 'winning' | 'losing' = 'neutral';
  
  // Flag to use new adaptive music system
  private useAdaptiveMusic = true;
  
  // Lazy injected adaptive music service (to avoid circular dependency)
  private _adaptiveMusicService: any = null;
  
  readonly enabled = this._enabled.asReadonly();
  readonly musicEnabled = this._musicEnabled.asReadonly();
  
  /**
   * Get adaptive music service lazily to avoid circular dependency
   */
  private getAdaptiveMusicService(): any {
    if (!this._adaptiveMusicService && this.useAdaptiveMusic) {
      try {
        // Dynamic import to avoid circular dependency
        const injector = (window as any).__angularInjector;
        if (injector) {
          this._adaptiveMusicService = injector.get('AdaptiveMusicService');
        }
      } catch {
        // Fallback to built-in music if adaptive music service is not available
        this.useAdaptiveMusic = false;
      }
    }
    return this._adaptiveMusicService;
  }
  
  /**
   * Set the adaptive music service reference (called from app initialization)
   */
  setAdaptiveMusicService(service: any): void {
    this._adaptiveMusicService = service;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        console.warn('Audio not supported');
      }
    }
  }

  /**
   * Toggle sound on/off
   */
  toggleSound(): void {
    const newValue = !this._enabled();
    this._enabled.set(newValue);
    this.saveSoundPreference(newValue);
  }

  /**
   * Toggle music on/off
   * Delegates to AdaptiveMusicService if available
   */
  toggleMusic(): void {
    const newValue = !this._musicEnabled();
    this._musicEnabled.set(newValue);
    this.saveMusicPreference(newValue);
    
    // Delegate to adaptive music service if available
    if (this._adaptiveMusicService) {
      if (newValue) {
        this._adaptiveMusicService.enableMusic();
      } else {
        this._adaptiveMusicService.disableMusic();
      }
      return;
    }
    
    // Fallback to basic music
    if (newValue) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  /**
   * Enable or disable sound
   */
  setEnabled(enabled: boolean): void {
    this._enabled.set(enabled);
    this.saveSoundPreference(enabled);
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType): void {
    if (!this._enabled()) return;
    
    this.initAudioContext();
    if (!this.audioContext) return;

    switch (type) {
      case 'move':
        this.playMoveSound();
        break;
      case 'capture':
        this.playCaptureSound();
        break;
      case 'win':
        this.playWinSound();
        // Also trigger victory fanfare from adaptive music
        if (this._adaptiveMusicService) {
          this._adaptiveMusicService.playVictoryFanfare();
        }
        break;
      case 'lose':
        this.playLoseSound();
        // Also trigger defeat sound from adaptive music
        if (this._adaptiveMusicService) {
          this._adaptiveMusicService.playDefeatSound();
        }
        break;
      case 'draw':
        this.playDrawSound();
        break;
      case 'invalid':
        this.playInvalidSound();
        break;
      case 'leaderboard':
        this.playLeaderboardFanfare();
        break;
    }
  }

  /**
   * Set music mood based on game state
   * Updates both internal mood and adaptive music service
   */
  setMusicMood(mood: 'neutral' | 'winning' | 'losing'): void {
    this.currentMood = mood;
    // Note: AdaptiveMusicService handles mood automatically via AdvantageCalculatorService
  }

  /**
   * Start background music (plays automatically based on enabled preference)
   * Delegates to AdaptiveMusicService if available
   */
  startBackgroundMusic(): void {
    // Delegate to adaptive music service if available
    if (this._adaptiveMusicService) {
      this._adaptiveMusicService.startMusic();
      return;
    }
    
    // Fallback to basic music
    this.initAudioContext();
    if (!this.musicEnabled()) return;
    
    // Stop existing music first
    this.stopBackgroundMusic();
    
    // Start new background music loop
    this.playLoopingBackgroundMusic();
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    // Also stop adaptive music if available
    if (this._adaptiveMusicService) {
      this._adaptiveMusicService.stopMusic();
    }
    
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.musicOscillators = [];
    
    if (this.musicGainNode) {
      this.musicGainNode.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 0.5);
    }
  }

  /**
   * Play looping background music with adaptive mood
   */
  private playLoopingBackgroundMusic(): void {
    if (!this.audioContext || !this.musicEnabled()) return;

    const playAdaptivePhrase = () => {
      if (!this.audioContext || !this.musicEnabled()) return;

      // Base frequency depends on mood
      let baseFreq = 261.63; // C4 for neutral
      let speedFactor = 1;
      
      if (this.currentMood === 'winning') {
        baseFreq = 329.63; // E4 for winning (happier)
        speedFactor = 1.2;
      } else if (this.currentMood === 'losing') {
        baseFreq = 196; // G3 for losing (darker)
        speedFactor = 0.8;
      }

      // Create adaptive melody
      const notes = this.currentMood === 'winning' 
        ? [1, 1.25, 1.5, 1.25, 1, 0.875, 0.875] // Happy ascending
        : this.currentMood === 'losing'
        ? [1, 0.875, 0.75, 0.875, 1, 1.125, 1] // Sad descending
        : [1, 1.25, 1, 0.875, 1, 1.125, 1]; // Neutral wandering

      const noteDuration = (0.5 / speedFactor);
      
      notes.forEach((ratio, idx) => {
        const freq = baseFreq * ratio;
        const startTime = this.audioContext!.currentTime + (idx * noteDuration);
        
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.setValueAtTime(0.1, startTime + noteDuration - 0.1);
        gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);
        
        osc.start(startTime);
        osc.stop(startTime + noteDuration + 0.1);
        
        this.musicOscillators.push(osc);
      });

      // Schedule next phrase (4 beats)
      const totalPhraseDuration = notes.length * noteDuration + 0.5;
      this.musicInterval = setTimeout(
        () => playAdaptivePhrase(),
        totalPhraseDuration * 1000
      );
    };

    playAdaptivePhrase();
  }

  /**
   * Play a subtle "click" sound for piece placement
   */
  private playMoveSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * Play a "flip" sound for capturing pieces
   */
  private playCaptureSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  /**
   * Play victory fanfare
   */
  private playWinSound(): void {
    if (!this.audioContext) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const duration = 0.15;
    
    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
      
      const startTime = this.audioContext!.currentTime + (i * duration);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Play defeat sound
   */
  private playLoseSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  /**
   * Play draw sound
   */
  private playDrawSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  /**
   * Play invalid move sound
   */
  private playInvalidSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * Load sound preference from localStorage
   */
  private loadSoundPreference(): boolean {
    try {
      const saved = localStorage.getItem('reversi-sound');
      return saved !== 'false'; // Default to true
    } catch {
      return true;
    }
  }

  /**
   * Save sound preference to localStorage
   */
  private saveSoundPreference(enabled: boolean): void {
    try {
      localStorage.setItem('reversi-sound', String(enabled));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Load music preference from localStorage
   */
  private loadMusicPreference(): boolean {
    try {
      const saved = localStorage.getItem('reversi-music');
      return saved === 'true'; // Default to false (music off by default)
    } catch {
      return false;
    }
  }

  /**
   * Save music preference to localStorage
   */
  private saveMusicPreference(enabled: boolean): void {
    try {
      localStorage.setItem('reversi-music', String(enabled));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Start ambient background music
   * Creates a relaxing, lo-fi ambient soundscape
   */
  startMusic(): void {
    if (!this._musicEnabled()) return;
    
    this.initAudioContext();
    if (!this.audioContext) return;
    
    // Stop any existing music
    this.stopMusic();
    
    // Create master gain for music
    this.musicGainNode = this.audioContext.createGain();
    this.musicGainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime); // Very quiet
    this.musicGainNode.connect(this.audioContext.destination);
    
    // Start ambient pad
    this.playAmbientPad();
    
    // Schedule chord changes every 8 seconds
    this.musicInterval = setInterval(() => {
      if (this._musicEnabled() && this.audioContext) {
        this.playAmbientPad();
      }
    }, 8000);
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    // Stop all oscillators
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore if already stopped
      }
    });
    this.musicOscillators = [];
    
    // Clear interval
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    
    // Disconnect gain node
    if (this.musicGainNode) {
      this.musicGainNode.disconnect();
      this.musicGainNode = null;
    }
  }

  /**
   * Play ambient pad chord
   */
  private playAmbientPad(): void {
    if (!this.audioContext || !this.musicGainNode) return;
    
    // Clean up old oscillators
    this.musicOscillators = this.musicOscillators.filter(osc => {
      try {
        return true;
      } catch {
        return false;
      }
    });
    
    // Chord progressions based on mood
    let chords: number[][];
    
    switch (this.currentMood) {
      case 'winning':
        // Bright, major chords
        chords = [
          [261.63, 329.63, 392.00, 523.25], // C major (higher octave)
          [293.66, 369.99, 440.00, 587.33], // D major
          [329.63, 415.30, 493.88, 659.25], // E major
          [349.23, 440.00, 523.25, 698.46], // F major
        ];
        break;
      case 'losing':
        // Dark, minor chords
        chords = [
          [130.81, 155.56, 196.00, 261.63], // C minor
          [146.83, 174.61, 220.00, 293.66], // D minor
          [164.81, 196.00, 233.08, 329.63], // E minor
          [174.61, 207.65, 261.63, 349.23], // F minor
        ];
        break;
      default:
        // Neutral, mix of major and minor
        chords = [
          [130.81, 164.81, 196.00, 261.63], // C major
          [146.83, 174.61, 220.00, 293.66], // D minor
          [164.81, 196.00, 246.94, 329.63], // E minor
          [174.61, 220.00, 261.63, 349.23], // F major
        ];
    }
    
    // Pick a random chord
    const chord = chords[Math.floor(Math.random() * chords.length)];
    
    // Create oscillators for each note in the chord
    chord.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const noteGain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
      
      // Add slight detune for warmth
      osc.detune.setValueAtTime(Math.random() * 10 - 5, this.audioContext!.currentTime);
      
      osc.connect(noteGain);
      noteGain.connect(this.musicGainNode!);
      
      // Fade in
      noteGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.15, this.audioContext!.currentTime + 2);
      
      // Hold
      noteGain.gain.setValueAtTime(0.15, this.audioContext!.currentTime + 5);
      
      // Fade out
      noteGain.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 8);
      
      osc.start(this.audioContext!.currentTime + (i * 0.1)); // Slight stagger
      osc.stop(this.audioContext!.currentTime + 8.5);
      
      this.musicOscillators.push(osc);
    });
    
    // Add a subtle high pad for atmosphere
    const highPad = this.audioContext.createOscillator();
    const highGain = this.audioContext.createGain();
    
    highPad.type = 'sine';
    highPad.frequency.setValueAtTime(chord[2] * 2, this.audioContext.currentTime);
    
    highPad.connect(highGain);
    highGain.connect(this.musicGainNode);
    
    highGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    highGain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 3);
    highGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 7);
    
    highPad.start(this.audioContext.currentTime);
    highPad.stop(this.audioContext.currentTime + 8);
    
    this.musicOscillators.push(highPad);
  }

  /**
   * Play a Mario Kart-style victory fanfare for the leaderboard
   */
  private playLeaderboardFanfare(): void {
    if (!this.audioContext) return;

    // Stop any currently playing music
    this.stopMusic();
    
    // Mario Kart-inspired victory melody notes (in Hz)
    // C-E-G ascending arpeggio followed by high C fanfare
    const melody = [
      { freq: 261.63, start: 0, duration: 0.15 },      // C4
      { freq: 329.63, start: 0.12, duration: 0.15 },   // E4
      { freq: 392.00, start: 0.24, duration: 0.15 },   // G4
      { freq: 523.25, start: 0.36, duration: 0.3 },    // C5 (hold)
      { freq: 659.25, start: 0.55, duration: 0.15 },   // E5
      { freq: 783.99, start: 0.67, duration: 0.15 },   // G5
      { freq: 1046.50, start: 0.79, duration: 0.5 },   // C6 (final)
    ];

    // Harmony notes (thirds below melody)
    const harmony = [
      { freq: 196.00, start: 0, duration: 0.15 },      // G3
      { freq: 261.63, start: 0.12, duration: 0.15 },   // C4
      { freq: 329.63, start: 0.24, duration: 0.15 },   // E4
      { freq: 392.00, start: 0.36, duration: 0.3 },    // G4
      { freq: 523.25, start: 0.55, duration: 0.15 },   // C5
      { freq: 659.25, start: 0.67, duration: 0.15 },   // E5
      { freq: 783.99, start: 0.79, duration: 0.5 },    // G5
    ];

    // Bass notes
    const bass = [
      { freq: 130.81, start: 0, duration: 0.5 },       // C3
      { freq: 164.81, start: 0.5, duration: 0.8 },     // E3
    ];

    // Smooth playNote with longer attack and release for gentler sound
    const playNote = (freq: number, start: number, duration: number, volume: number, type: OscillatorType = 'triangle') => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      // Smoother envelope: longer attack and release for a gentler sound
      const attackTime = 0.08;  // Increased from 0.02 for smoother fade-in
      const releaseTime = Math.min(duration * 0.5, 0.3);  // Longer release
      
      gain.gain.setValueAtTime(0, this.audioContext!.currentTime + start);
      gain.gain.linearRampToValueAtTime(volume * 0.7, this.audioContext!.currentTime + start + attackTime);  // Softer peak
      gain.gain.setValueAtTime(volume * 0.7, this.audioContext!.currentTime + start + duration - releaseTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + start + duration);  // Exponential decay
      
      osc.start(this.audioContext!.currentTime + start);
      osc.stop(this.audioContext!.currentTime + start + duration + 0.15);
    };

    // Play melody (softer, triangle wave for gentler sound)
    melody.forEach(note => {
      playNote(note.freq, note.start, note.duration, 0.15, 'triangle');  // Changed from square to triangle, reduced volume
    });

    // Play harmony (even softer)
    harmony.forEach(note => {
      playNote(note.freq, note.start, note.duration, 0.08, 'sine');  // Changed to sine for smoothness
    });

    // Play bass (gentle)
    bass.forEach(note => {
      playNote(note.freq, note.start, note.duration, 0.12, 'sine');
    });

    // Add a final triumphant chord with smooth fade
    const finalChord = [523.25, 659.25, 783.99, 1046.50]; // C major spread
    finalChord.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      const startTime = 1.1 + (i * 0.03);  // Slightly more stagger
      
      // Much smoother envelope for final chord
      gain.gain.setValueAtTime(0, this.audioContext!.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.10, this.audioContext!.currentTime + startTime + 0.2);  // Slower attack
      gain.gain.setValueAtTime(0.10, this.audioContext!.currentTime + startTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + startTime + 2.0);  // Longer, smoother fade
      
      osc.start(this.audioContext!.currentTime + startTime);
      osc.stop(this.audioContext!.currentTime + startTime + 2.1);
    });
  }
}
