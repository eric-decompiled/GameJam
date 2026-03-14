// Singleton audio manager for smooth sound playback
class AudioManagerClass {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private initialized: boolean = false;
    private musicSource: AudioBufferSourceNode | null = null;
    private musicGain: GainNode | null = null;
    private currentMusic: string | null = null;
    private masterGain: GainNode | null = null;
    private _muted: boolean = false;

    // Initialize audio context on first user interaction
    async init(): Promise<void> {
        if (this.initialized) return;

        this.context = new AudioContext();

        // Create master gain node for mute control
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);

        // Resume context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        // Set up listeners to resume context on user interaction
        const resumeContext = async () => {
            if (this.context?.state === 'suspended') {
                await this.context.resume();
            }
        };

        document.addEventListener('click', resumeContext, { once: true });
        document.addEventListener('keydown', resumeContext, { once: true });

        this.initialized = true;
    }

    // Preload a sound file
    async preload(name: string, url: string): Promise<void> {
        if (!this.context) await this.init();
        if (this.buffers.has(name)) return;

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (error) {
            console.error(`Failed to preload audio: ${name}`, error);
        }
    }

    // Play a preloaded sound
    play(name: string, volume: number = 1.0): void {
        if (!this.context) return;

        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`Audio not preloaded: ${name}`);
            return;
        }

        // Resume context if needed
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain || this.context.destination);

        source.start(0);
    }

    // Play looping background music
    playMusic(name: string, volume: number = 0.3): void {
        if (!this.context) return;
        if (this.currentMusic === name) return; // Already playing

        this.stopMusic();

        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`Music not preloaded: ${name}`);
            return;
        }

        // Resume context if needed
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        this.musicSource = this.context.createBufferSource();
        this.musicSource.buffer = buffer;
        this.musicSource.loop = true;

        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = volume;

        this.musicSource.connect(this.musicGain);
        this.musicGain.connect(this.masterGain || this.context.destination);

        this.musicSource.start(0);
        this.currentMusic = name;
    }

    // Stop background music with optional fade out
    stopMusic(fadeTime: number = 0.5): void {
        if (!this.musicGain || !this.musicSource || !this.context) {
            this.currentMusic = null;
            return;
        }

        const currentTime = this.context.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, currentTime);
        this.musicGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);

        const source = this.musicSource;
        setTimeout(() => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        }, fadeTime * 1000);

        this.musicSource = null;
        this.musicGain = null;
        this.currentMusic = null;
    }

    // Get context state for debugging
    getState(): string {
        return this.context?.state || 'not initialized';
    }

    // Mute/unmute all audio
    get isMuted(): boolean {
        return this._muted;
    }

    mute(): void {
        this._muted = true;
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
    }

    unmute(): void {
        this._muted = false;
        if (this.masterGain) {
            this.masterGain.gain.value = 1;
        }
    }

    toggleMute(): boolean {
        if (this._muted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this._muted;
    }
}

// Export singleton instance
export const AudioManager = new AudioManagerClass();
