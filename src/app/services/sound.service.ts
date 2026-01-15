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
  
  readonly enabled = this._enabled.asReadonly();

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
}
