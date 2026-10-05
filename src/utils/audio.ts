class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;
  private popAudioTemplate: HTMLAudioElement | null = null;
  private shootAudioTemplate: HTMLAudioElement | null = null;
  private currentGameState: string = 'login';

  constructor() {
    if (typeof window !== 'undefined') {
      this.bgmAudio = new Audio('/dupilupiworld-dupi-lupi-giggle-bubbles-226557.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.35;

      this.popAudioTemplate = new Audio('/dragon-studio-bubble-pop-406640.mp3');
      this.popAudioTemplate.preload = 'auto';

      this.shootAudioTemplate = new Audio('/dragon-studio-copyright-free-whoosh-487675.mp3');
      this.shootAudioTemplate.preload = 'auto';

      const unlockAudio = () => {
        this.init();
        if (this.enabled && (this.currentGameState === 'login' || this.currentGameState === 'menu') && this.bgmAudio && this.bgmAudio.paused) {
          this.playBGM();
        }
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.pauseBGM();
    } else {
      this.init();
      this.playBGM();
    }
  }

  playBGM() {
    if (!this.enabled || !this.bgmAudio) return;
    if (this.currentGameState !== 'login' && this.currentGameState !== 'menu') {
      this.pauseBGM();
      return;
    }
    this.bgmAudio.volume = 0.35;

    if (this.bgmAudio.paused) {
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('BGM play restricted or failed:', err);
        });
      }
    }
  }

  pauseBGM() {
    if (this.bgmAudio) {
      if (!this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
    }
  }

  updateBGMState(gameState: string) {
    this.currentGameState = gameState;
    if (!this.enabled) {
      this.pauseBGM();
      return;
    }
    if (gameState === 'login' || gameState === 'menu') {
      this.playBGM();
    } else {
      this.pauseBGM();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shoot() {
    if (!this.enabled) return;
    try {
      if (this.shootAudioTemplate) {
        const sound = this.shootAudioTemplate.cloneNode() as HTMLAudioElement;
        sound.volume = 0.1;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playShootTone();
          });
        }
      } else {
        const shootAudio = new Audio('/dragon-studio-copyright-free-whoosh-487675.mp3');
        shootAudio.volume = 0.1;
        shootAudio.play().catch(() => {
          this.playShootTone();
        });
      }
    } catch {
      this.playShootTone();
    }
  }

  private playShootTone() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  pop() {
    if (!this.enabled) return;
    try {
      if (this.popAudioTemplate) {
        const sound = this.popAudioTemplate.cloneNode() as HTMLAudioElement;
        sound.volume = 0.95;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playTone(600, 'sine', 0.1, 0.15);
            setTimeout(() => this.playTone(800, 'sine', 0.1, 0.1), 50);
          });
        }
      } else {
        const popAudio = new Audio('/dragon-studio-bubble-pop-406640.mp3');
        popAudio.volume = 0.95;
        popAudio.play().catch(() => {
          this.playTone(600, 'sine', 0.1, 0.15);
        });
      }
    } catch {
      this.playTone(600, 'sine', 0.1, 0.15);
      setTimeout(() => this.playTone(800, 'sine', 0.1, 0.1), 50);
    }
  }

  bomb() {
    this.pop();
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  gameover() {
    if (!this.enabled || !this.ctx) return;
    const notes = [300, 250, 200, 150];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.4, 0.1);
      }, i * 300);
    });
  }

  win() {
    if (!this.enabled || !this.ctx) return;
    const notes = [400, 500, 600, 800];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.2, 0.1);
      }, i * 150);
    });
  }
}

export const audio = new AudioEngine();
