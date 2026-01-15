/**
 * Sound Service
 * Handles audio effects for game events
 * User can enable/disable sounds via settings
 */

import { Injectable, signal } from '@angular/core';

export type SoundType = 'move' | 'capture' | 'win' | 'lose' | 'draw' | 'invalid';

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
  
  readonly enabled = this._enabled.asReadonly();
  readonly musicEnabled = this._musicEnabled.asReadonly();

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
   */
  toggleMusic(): void {
    const newValue = !this._musicEnabled();
    this._musicEnabled.set(newValue);
    this.saveMusicPreference(newValue);
    
    if (newValue) {
      this.startMusic();
    } else {
      this.stopMusic();
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
        break;
      case 'lose':
        this.playLoseSound();
        break;
      case 'draw':
        this.playDrawSound();
        break;
      case 'invalid':
        this.playInvalidSound();
        break;
    }
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
    
    // Ambient chord progressions (frequencies in Hz)
    const chords = [
      [130.81, 164.81, 196.00, 261.63], // C major
      [146.83, 174.61, 220.00, 293.66], // D minor
      [164.81, 196.00, 246.94, 329.63], // E minor
      [174.61, 220.00, 261.63, 349.23], // F major
    ];
    
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
}
