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

// Note frequencies - Full chromatic scale for rich harmonies
const NOTES = {
    // Octave 2
    G2: 98.00, A2: 110.00, B2: 123.47,
    // Octave 3
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
    // Octave 4
    C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
    // Octave 5
    C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33, B5: 987.77,
    // Octave 6
    C6: 1046.50, D6: 1174.66, E6: 1318.51
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
    private musicBusGain: GainNode | null = null;
    private masterGain: GainNode | null = null;
    private lowpassFilter: BiquadFilterNode | null = null;
    private masterCompressor: DynamicsCompressorNode | null = null;
    private masterLimiter: DynamicsCompressorNode | null = null;
    private reverbNode: ConvolverNode | null = null;
    private reverbSendGain: GainNode | null = null;
    private reverbReturnGain: GainNode | null = null;
    private delayNode: DelayNode | null = null;
    private delaySendGain: GainNode | null = null;
    private delayFeedbackGain: GainNode | null = null;

    // Active oscillators and scheduled events
    private activeOscillators: OscillatorNode[] = [];
    private oscillatorGains = new WeakMap<OscillatorNode, GainNode>();
    private scheduledTimeouts: number[] = [];
    private loopInterval: number | null = null;
    private barIndex = 0;

    // State signals
    // Default to false - music only starts after user explicitly enables it
    private _enabled = signal(this.loadMusicPreference());
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

    private readonly NOTE_FADE_TIME = 0.06;
    private readonly DEBUG = false;

    // Public readonly signals
    readonly enabled = this._enabled.asReadonly();
    readonly gameMode = this._gameMode.asReadonly();
    readonly masterVolume = this._masterVolume.asReadonly();
    readonly isPlaying = this._isPlaying.asReadonly();
    readonly currentMood = computed(() => this._currentMood());

    constructor() {
        this.setupUserGestureUnlock();

        // Set up effect to react to advantage changes
        effect(() => {
            const musicState = this.advantageCalculator.musicState();
            if (this._enabled() && this._isPlaying()) {
                this.updateTargetMood(musicState);
            }
        });
    }

    private setupUserGestureUnlock(): void {
        const unlock = () => {
            if (this._hasUserInteracted()) return;
            this._hasUserInteracted.set(true);
            if (this._enabled() && !this._isPlaying()) {
                void this.startMusic();
            }
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
            window.removeEventListener('touchstart', unlock, true);
        };

        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);
        window.addEventListener('touchstart', unlock, true);
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    private initAudioContext(): void {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                // Music bus (all sources route here)
                this.musicBusGain = this.audioContext.createGain();
                this.musicBusGain.gain.value = 1.0;

                // Create master gain node
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this._masterVolume();

                // Create lowpass filter for warmth and mood control
                this.lowpassFilter = this.audioContext.createBiquadFilter();
                this.lowpassFilter.type = 'lowpass';
                this.lowpassFilter.frequency.value = 2000;
                this.lowpassFilter.Q.value = 0.5;

                // Glue compressor
                this.masterCompressor = this.audioContext.createDynamicsCompressor();
                this.masterCompressor.threshold.value = -22;
                this.masterCompressor.knee.value = 18;
                this.masterCompressor.ratio.value = 3;
                this.masterCompressor.attack.value = 0.008;
                this.masterCompressor.release.value = 0.18;

                // Soft limiter
                this.masterLimiter = this.audioContext.createDynamicsCompressor();
                this.masterLimiter.threshold.value = -7;
                this.masterLimiter.knee.value = 0;
                this.masterLimiter.ratio.value = 20;
                this.masterLimiter.attack.value = 0.002;
                this.masterLimiter.release.value = 0.08;

                // Reverb
                this.reverbNode = this.audioContext.createConvolver();
                this.reverbNode.buffer = this.generateImpulseResponse(2.2);
                this.reverbSendGain = this.audioContext.createGain();
                this.reverbSendGain.gain.value = 0.08;
                this.reverbReturnGain = this.audioContext.createGain();
                this.reverbReturnGain.gain.value = 0.32;

                // Delay
                this.delayNode = this.audioContext.createDelay(1.0);
                this.delayNode.delayTime.value = 0.18;
                this.delaySendGain = this.audioContext.createGain();
                this.delaySendGain.gain.value = 0.06;
                this.delayFeedbackGain = this.audioContext.createGain();
                this.delayFeedbackGain.gain.value = 0.22;

                // Dry routing: bus -> filter -> compressor -> limiter -> master -> destination
                this.musicBusGain.connect(this.lowpassFilter);
                this.lowpassFilter.connect(this.masterCompressor);
                this.masterCompressor.connect(this.masterLimiter);
                this.masterLimiter.connect(this.masterGain);
                this.masterGain.connect(this.audioContext.destination);

                // FX sends from bus
                this.musicBusGain.connect(this.reverbSendGain);
                this.reverbSendGain.connect(this.reverbNode);
                this.reverbNode.connect(this.reverbReturnGain);
                this.reverbReturnGain.connect(this.masterCompressor);

                this.musicBusGain.connect(this.delaySendGain);
                this.delaySendGain.connect(this.delayNode);
                this.delayNode.connect(this.delayFeedbackGain);
                this.delayFeedbackGain.connect(this.delayNode);
                this.delayNode.connect(this.masterCompressor);

            } catch (e) {
                console.warn('Web Audio API not supported:', e);
            }
        }
    }

    private generateImpulseResponse(durationSeconds: number): AudioBuffer {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }

        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * durationSeconds);
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const decay = Math.pow(1 - t, 3.2);
                const noise = (Math.random() * 2 - 1) * decay;
                const early = i < sampleRate * 0.03 ? noise * 1.8 : noise;
                channelData[i] = early;
            }
        }

        return impulse;
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
     * Called when a piece is played - triggers immediate musical response
     * This creates real-time reactivity to game state changes
     */
    onPiecePlayed(): void {
        if (!this._isPlaying() || !this.audioContext) return;

        const advantageScore = this.advantageCalculator.advantageScore();
        const normalizedScore = (advantageScore + 1) / 2;

        // Update filter immediately for tonal change
        this.updateFilterForMood(advantageScore);

        // Play a reactive accent note based on current advantage
        const baseVolume = this._layerVolumes()[MusicLayer.Melody] * 0.1;

        // Different accent notes based on whether the move was good or bad
        let accentNote: number;
        if (normalizedScore > 0.6) {
            // Winning - bright ascending accent
            accentNote = NOTES.G5;
            this.playNote(accentNote, 0, 0.3, baseVolume * 1.2, 'sine');
            this.playNote(NOTES.E5, 0.05, 0.25, baseVolume * 0.8, 'sine');
        } else if (normalizedScore < 0.4) {
            // Losing - soft descending accent
            accentNote = NOTES.D4;
            this.playNote(accentNote, 0, 0.4, baseVolume * 0.8, 'sine');
        } else {
            // Neutral - gentle ping
            accentNote = NOTES.C5;
            this.playNote(accentNote, 0, 0.25, baseVolume * 0.9, 'sine');
        }

        if (this.DEBUG) {
            const moodEmoji = normalizedScore > 0.6 ? '🎵✨' : normalizedScore < 0.4 ? '🎵🌙' : '🎵';
            console.debug(`${moodEmoji} Music accent: advantage=${(advantageScore * 100).toFixed(0)}%, note=${accentNote.toFixed(0)}Hz`);
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
     * Start the main music loop - CONTINUOUS ambient music
     * Uses overlapping scheduling to eliminate gaps
     */
    private startMusicLoop(): void {
        if (!this.audioContext) return;

        this.barIndex = 0;

        // Start continuous arpeggio loop
        this.scheduleArpeggio(0);

        // Start continuous pad drone
        this.schedulePadDrone(0);

        // Schedule next arpeggio cycles - shorter intervals for continuous feel
        const cycleTime = BEAT_DURATION * 4 * 1000; // One bar cycle
        this.loopInterval = window.setInterval(() => {
            if (this._isPlaying()) {
                this.barIndex += 1;
                this.scheduleArpeggio(0);
                this.schedulePadDrone(0);
            }
        }, cycleTime);
    }

    /**
     * Schedule a continuous arpeggio pattern
     * Creates flowing, ambient texture
     */
    private scheduleArpeggio(startOffset: number): void {
        if (!this.audioContext || !this._isPlaying()) return;

        const advantageScore = this.advantageCalculator.advantageScore();
        const normalizedScore = (advantageScore + 1) / 2; // 0 to 1

        // Update filter for continuous tonal change
        this.updateFilterForMood(advantageScore);

        const chord = this.getChordForCurrentBar(normalizedScore);
        const pool = this.buildArpeggioPool(chord, normalizedScore);

        const step = BAR_DURATION / 16; // 16th grid
        const swing = 0.02 + normalizedScore * 0.03; // 20–50ms-ish micro swing

        // Volume adapts
        const baseVolume = this._layerVolumes()[MusicLayer.Melody] * 0.085;
        const volume = baseVolume * (0.55 + normalizedScore * 0.55);

        // 2 motifs, swapped every 2 bars + mood tint
        const motifA = [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 4, 3, 2, 1];
        const motifB = [0, 1, 2, 1, 3, 2, 3, 4, 0, 1, 2, 3, 4, 3, 2, 1];
        const motif = (this.barIndex % 4) < 2 ? motifA : motifB;

        // More sparkle when winning, more calm when losing
        const leadType: OscillatorType = normalizedScore > 0.67 ? 'triangle' : normalizedScore < 0.33 ? 'sine' : 'triangle';
        const octaveBoost = normalizedScore > 0.67 ? 2 : 1;

        for (let i = 0; i < 16; i++) {
            const idx = motif[i] % pool.length;
            let note = pool[idx];

            // occasional octave lift on phrase ends
            if ((i === 7 || i === 15) && normalizedScore > 0.55) {
                note *= octaveBoost;
            }

            const micro = (i % 2 === 1) ? swing : 0;
            const delay = startOffset + i * step + micro;
            const duration = step * 1.65;

            // Add a few rests to breathe (esp. losing)
            const restChance = normalizedScore < 0.33 ? 0.22 : normalizedScore > 0.67 ? 0.08 : 0.14;
            if (this.pseudoRand(this.barIndex * 1000 + i) < restChance && (i % 4 !== 0)) {
                continue;
            }

            this.playNote(note, delay, duration, volume, leadType);
        }
    }

    private getChordForCurrentBar(normalizedScore: number): number[] {
        const moodKey = normalizedScore < 0.35 ? 'losing' : normalizedScore > 0.65 ? 'winning' : 'neutral';
        const progression = (CHORD_PROGRESSIONS as any)[moodKey] as number[][];
        const chordIndex = this.barIndex % progression.length;
        return progression[chordIndex];
    }

    private buildArpeggioPool(chord: number[], normalizedScore: number): number[] {
        const triad = chord.slice(0, 3);
        const up = triad.map(n => n * 2);
        // Add a gentle color tone in neutral/winning (keeps it “gamey” and catchy)
        const color = normalizedScore > 0.55 ? [NOTES.A4, NOTES.D5] : normalizedScore > 0.35 ? [NOTES.D5] : [];
        return [...triad, ...up, ...color];
    }

    private pseudoRand(seed: number): number {
        // Deterministic 0..1 for scheduling decisions
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    }

    /**
     * Schedule continuous pad drone for warmth
     */
    private schedulePadDrone(startOffset: number): void {
        if (!this.audioContext || !this._isPlaying()) return;

        const advantageScore = this.advantageCalculator.advantageScore();
        const normalizedScore = (advantageScore + 1) / 2;

        const baseVolume = this._layerVolumes()[MusicLayer.Harmony] * 0.055;
        const volume = baseVolume * (0.5 + normalizedScore * 0.45);

        // Follow the same chord progression as the arpeggio
        const chord = this.getChordForCurrentBar(normalizedScore);

        // Build a warm pad: root (down octave) + 5th + 3rd, plus octave
        const root = chord[0];
        const third = chord[1];
        const fifth = chord[2];

        const padNotes = [root / 2, root, fifth, third, root * 2];

        // 2-bar pad with overlap (re-scheduled each bar)
        const dur = BAR_DURATION * 2.2;
        const padType: OscillatorType = normalizedScore > 0.65 ? 'triangle' : normalizedScore < 0.35 ? 'sine' : 'triangle';

        padNotes.forEach((n, i) => {
            const v = volume * (i === 0 ? 0.8 : 0.55);
            this.playNote(n, startOffset, dur, v, padType);
        });
    }

    /**
     * Play a complete musical phrase (2 bars) - called periodically
     */
    private playMusicalPhrase(): void {
        // This is now handled by scheduleArpeggio and schedulePadDrone
        // Keeping for compatibility
    }

    /**
     * Play a neutral phrase (for competitive mode)
     */
    private playNeutralPhrase(intensity: number): void {
        // Simplified for competitive mode
        this.scheduleArpeggio(0);
    }

    /**
     * Play the bass layer - Now integrated into pad drone
     */
    private playBassLayer(mood: InterpolatedMood, intensity: number): void {
        // Handled by schedulePadDrone for continuous feel
    }

    /**
     * Play the harmony layer - Now integrated into arpeggio
     */
    private playHarmonyLayer(mood: InterpolatedMood, intensity: number): void {
        // Handled by scheduleArpeggio for continuous feel
    }

    /**
     * Play the melody layer - Occasional melodic flourishes
     */
    private playMelodyLayer(mood: InterpolatedMood, intensity: number): void {
        // Melodic accents are now part of arpeggio octave shifts
    }

    /**
     * Play rhythm layer - subtle accents
     */
    private playRhythmLayer(mood: InterpolatedMood, intensity: number): void {
        // Rhythm is now integrated into the continuous arpeggio pattern
    }

    // ============================================================
    // AUDIO UTILITIES
    // ============================================================

    /**
     * Play a single note with soft ambient envelope
     */
    private playNote(
        frequency: number,
        startOffset: number,
        duration: number,
        volume: number,
        type: OscillatorType = 'sine'
    ): void {
        if (!this.audioContext || !this.musicBusGain) return;

        const gain = this.audioContext.createGain();

        // Slightly richer timbre without getting harsh
        const oscA = this.audioContext.createOscillator();
        const oscB = this.audioContext.createOscillator();
        oscA.type = type;
        oscB.type = type;
        oscA.frequency.value = frequency;
        oscB.frequency.value = frequency;

        // Gentle detune for width/thickness
        const detuneAmount = 6;
        oscA.detune.value = (Math.random() - 0.5) * detuneAmount;
        oscB.detune.value = -oscA.detune.value;

        // Subtle vibrato on mid/high notes (more "alive" / less beep)
        if (frequency >= NOTES.C4) {
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 5.3;
            lfoGain.gain.value = 4.5;
            lfo.connect(lfoGain);
            lfoGain.connect(oscA.frequency);
            lfoGain.connect(oscB.frequency);

            const lfoStart = this.audioContext.currentTime + startOffset;
            lfo.start(lfoStart);
            lfo.stop(lfoStart + duration + 0.2);
        }

        oscA.connect(gain);
        oscB.connect(gain);
        gain.connect(this.musicBusGain);

        const startTime = this.audioContext.currentTime + startOffset;

        // Softer ambient envelope - longer attack and release for smooth sound
        const attackTime = Math.min(0.08, duration * 0.25);
        const decayTime = Math.min(0.1, duration * 0.15);
        const sustainLevel = 0.7;
        const releaseTime = Math.min(0.25, duration * 0.4);

        // ADSR envelope - ambient style with soft transitions
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
        gain.gain.linearRampToValueAtTime(volume * sustainLevel, startTime + attackTime + decayTime);
        gain.gain.setValueAtTime(volume * sustainLevel, startTime + duration - releaseTime);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        oscA.start(startTime);
        oscB.start(startTime);
        oscA.stop(startTime + duration + 0.15);
        oscB.stop(startTime + duration + 0.15);

        this.activeOscillators.push(oscA, oscB);
        this.oscillatorGains.set(oscA, gain);
        this.oscillatorGains.set(oscB, gain);

        // Clean up oscillator after it stops
        const cleanupId = window.setTimeout(() => {
            this.activeOscillators = this.activeOscillators.filter(o => o !== oscA && o !== oscB);
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
            this.playNote(freq, startOffset + stagger, duration, volumePerNote, 'triangle');
        });
    }

    /**
     * Stop all active oscillators
     */
    private stopAllOscillators(fade: boolean = true): void {
        if (!this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const fadeTime = fade ? 0.35 : 0;

        this.activeOscillators.forEach(osc => {
            try {
                if (fade) {
                    const gain = this.oscillatorGains.get(osc);
                    if (gain) {
                        gain.gain.cancelScheduledValues(currentTime);
                        gain.gain.setValueAtTime(gain.gain.value, currentTime);
                        gain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);
                    }
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
     * - Winning: Higher frequency (6000Hz) = bright, sparkly, energetic sound
     * - Neutral: Medium frequency (2500Hz) = balanced sound
     * - Losing: Lower frequency (400Hz) = dark, muffled, subdued sound
     */
    private updateFilterForMood(advantageScore: number): void {
        if (!this.lowpassFilter || !this.audioContext) return;

        // Map advantage score (-1 to 1) to filter frequency (400 to 6000 Hz)
        // VERY dramatic range for clearly audible difference
        const minFreq = 400;
        const maxFreq = 6000;
        const normalizedScore = (advantageScore + 1) / 2; // 0 to 1
        const targetFreq = minFreq + (maxFreq - minFreq) * normalizedScore;

        // Smooth transition to new frequency
        const currentTime = this.audioContext.currentTime;
        this.lowpassFilter.frequency.cancelScheduledValues(currentTime);
        this.lowpassFilter.frequency.setValueAtTime(this.lowpassFilter.frequency.value, currentTime);
        this.lowpassFilter.frequency.linearRampToValueAtTime(targetFreq, currentTime + 0.3);

        // Also adjust Q for more dramatic effect when winning (resonant sparkle)
        const targetQ = 0.3 + (normalizedScore * 3.0); // 0.3 to 3.3 - very noticeable
        this.lowpassFilter.Q.cancelScheduledValues(currentTime);
        this.lowpassFilter.Q.setValueAtTime(this.lowpassFilter.Q.value, currentTime);
        this.lowpassFilter.Q.linearRampToValueAtTime(targetQ, currentTime + 0.3);

        // Subtle ambience: a bit more space when losing, slightly drier when winning
        if (this.reverbSendGain && this.delaySendGain) {
            const losingAmount = Math.max(0, -advantageScore);
            const winningAmount = Math.max(0, advantageScore);

            const reverbTarget = 0.06 + losingAmount * 0.14 - winningAmount * 0.04;
            const delayTarget = 0.04 + losingAmount * 0.08 - winningAmount * 0.02;

            const clamp = (v: number) => Math.max(0, Math.min(0.25, v));

            this.reverbSendGain.gain.cancelScheduledValues(currentTime);
            this.reverbSendGain.gain.setValueAtTime(this.reverbSendGain.gain.value, currentTime);
            this.reverbSendGain.gain.linearRampToValueAtTime(clamp(reverbTarget), currentTime + 0.6);

            this.delaySendGain.gain.cancelScheduledValues(currentTime);
            this.delaySendGain.gain.setValueAtTime(this.delaySendGain.gain.value, currentTime);
            this.delaySendGain.gain.linearRampToValueAtTime(clamp(delayTarget), currentTime + 0.6);
        }
    }

    /**
     * Get interpolated mood based on crossfade progress
     */
    private getInterpolatedMood(): InterpolatedMood {
        const advantageScore = this.advantageCalculator.advantageScore();
        const absScore = Math.abs(advantageScore);
        const normalizedScore = (advantageScore + 1) / 2; // 0 to 1 for progressive

        // Calculate winning and losing influences (0 to 1)
        const winningInfluence = Math.max(0, advantageScore);
        const losingInfluence = Math.max(0, -advantageScore);

        // Update filter based on mood for more noticeable change
        this.updateFilterForMood(advantageScore);

        // State is now less important - we use normalizedScore for progressive adaptation
        // But keep for compatibility
        let state = MusicState.Neutral;
        let moodName = '🎵 Neutral';
        if (advantageScore >= 0.15) {
            state = MusicState.Winning;
            moodName = '🎉 Winning';
        } else if (advantageScore <= -0.15) {
            state = MusicState.Losing;
            moodName = '😔 Losing';
        }

        // Debug: show advantage score and mood
        if (this.DEBUG) {
            console.log(`${moodName} | Advantage: ${(advantageScore * 100).toFixed(0)}% | Filter: ${this.lowpassFilter?.frequency.value.toFixed(0)}Hz`);
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
