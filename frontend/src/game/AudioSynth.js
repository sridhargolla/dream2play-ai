/**
 * Procedural Audio Synthesizer using the browser's Web Audio API.
 * Synthesizes retro game music (BGM) and sound effects (SFX) on-the-fly.
 */
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.bgmOscs = [];
    this.bgmGain = null;
    this.masterGain = null;
    this.bgmInterval = null;
    this.isMuted = false;
    this.currentMood = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Master volume
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // BGM volume relative to SFX
      this.bgmGain.connect(this.masterGain);
    } catch (err) {
      console.error('Failed to initialize Web Audio API:', err);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.3, this.ctx ? this.ctx.currentTime : 0);
    }
  }

  playSFX(type) {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    
    switch (type) {
      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'jump': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.12);
        
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'collect': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.setValueAtTime(0.25, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      }
      case 'hurt': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(60, t + 0.15);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'explosion': {
        // Synthesizing a dirty noise crash using low frequency sawtooth and high gain roll off
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(10, t + 0.4);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(10, t + 0.4);
        
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.45);
        break;
      }
      case 'win': {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);
          gain.gain.setValueAtTime(0.3, t + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.1 + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + 0.25);
        });
        break;
      }
      case 'gameover': {
        const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + idx * 0.12);
          gain.gain.setValueAtTime(0.35, t + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + idx * 0.12);
          osc.stop(t + idx * 0.12 + 0.3);
        });
        break;
      }
    }
  }

  playBGM(mood) {
    this.ensureContext();
    this.stopBGM();
    
    if (this.isMuted || !this.ctx) return;
    this.currentMood = mood;
    
    const t = this.ctx.currentTime;
    
    // Choose scales and tempos based on mood
    if (mood === 'Sci-Fi') {
      // 8-step techno arpeggio
      const scale = [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25]; // C minor
      let step = 0;
      this.bgmInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const curTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(scale[step % scale.length], curTime);
        
        // Add a bit of pulse width behavior using square/sine combo
        gain.gain.setValueAtTime(0.12, curTime);
        gain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.22);
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(curTime);
        osc.stop(curTime + 0.25);
        
        // Bassline every 4 steps
        if (step % 4 === 0) {
          const bass = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bass.type = 'triangle';
          bass.frequency.setValueAtTime(scale[0] / 2, curTime);
          bassGain.gain.setValueAtTime(0.2, curTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.45);
          bass.connect(bassGain);
          bassGain.connect(this.bgmGain);
          bass.start(curTime);
          bass.stop(curTime + 0.5);
        }
        
        step++;
      }, 200); // 120 bpm (8th notes)
    } 
    else if (mood === 'Horror') {
      // Eerie low drone + creepy high random minor seconds
      const droneScale = [110.00, 116.54]; // A2, Bb2 (dissonant semitone)
      const highScale = [440.00, 466.16, 493.88, 523.25]; // A4, Bb4, B4, C5
      
      // Start ambient low drone
      const droneOsc1 = this.ctx.createOscillator();
      const droneOsc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      
      droneOsc1.type = 'sawtooth';
      droneOsc1.frequency.setValueAtTime(droneScale[0], t);
      droneOsc2.type = 'sawtooth';
      droneOsc2.frequency.setValueAtTime(droneScale[1], t); // Detuned drone
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, t);
      
      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.15, t);
      
      droneOsc1.connect(filter);
      droneOsc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(this.bgmGain);
      
      droneOsc1.start(t);
      droneOsc2.start(t);
      this.bgmOscs.push(droneOsc1, droneOsc2);
      
      // Spooky bell ticks at random intervals
      this.bgmInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const curTime = this.ctx.currentTime;
        const bell = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        
        bell.type = 'sine';
        const freq = highScale[Math.floor(Math.random() * highScale.length)];
        bell.frequency.setValueAtTime(freq, curTime);
        
        bellGain.gain.setValueAtTime(0.08, curTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, curTime + 1.2);
        
        bell.connect(bellGain);
        bellGain.connect(this.bgmGain);
        
        bell.start(curTime);
        bell.stop(curTime + 1.3);
      }, 1200);
    } 
    else if (mood === 'Fantasy') {
      // Magic major scales, high chime arpeggios
      const scale = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99]; // D major pentatonic
      let step = 0;
      
      this.bgmInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const curTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        const note = scale[step % scale.length];
        osc.frequency.setValueAtTime(note, curTime);
        
        gain.gain.setValueAtTime(0.1, curTime);
        gain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.6);
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(curTime);
        osc.stop(curTime + 0.65);
        
        // Add a secondary delayed chime for echo effect
        setTimeout(() => {
          if (!this.ctx || this.isMuted || this.currentMood !== 'Fantasy') return;
          const delayTime = this.ctx.currentTime;
          const echoOsc = this.ctx.createOscillator();
          const echoGain = this.ctx.createGain();
          echoOsc.type = 'sine';
          echoOsc.frequency.setValueAtTime(note * 1.5, delayTime); // Perfect fifth fifth harmony
          echoGain.gain.setValueAtTime(0.03, delayTime);
          echoGain.gain.exponentialRampToValueAtTime(0.001, delayTime + 0.4);
          echoOsc.connect(echoGain);
          echoGain.connect(this.bgmGain);
          echoOsc.start(delayTime);
          echoOsc.stop(delayTime + 0.45);
        }, 150);

        step++;
      }, 350);
    } 
    else if (mood === 'Adventure') {
      // Upbeat 8-bit theme (square wave, fast pentatonic scale)
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C Major pentatonic
      let step = 0;
      
      this.bgmInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const curTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        // Fun retro patterns
        const pattern = [0, 2, 3, 4, 3, 4, 5, 4];
        const note = scale[pattern[step % pattern.length]];
        osc.frequency.setValueAtTime(note, curTime);
        
        gain.gain.setValueAtTime(0.06, curTime);
        gain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(curTime);
        osc.stop(curTime + 0.18);
        
        // Bassline
        if (step % 2 === 0) {
          const bass = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bass.type = 'triangle';
          bass.frequency.setValueAtTime(scale[step % 3] / 2, curTime);
          bassGain.gain.setValueAtTime(0.15, curTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.3);
          bass.connect(bassGain);
          bassGain.connect(this.bgmGain);
          bass.start(curTime);
          bass.stop(curTime + 0.32);
        }
        
        step++;
      }, 150);
    }
    else if (mood === 'Mystery') {
      // Slow tempo jazzy chords, minor 7ths
      const chordC = [130.81, 196.00, 246.94, 293.66]; // C3, G3, B3, D4 (Cmaj9)
      const chordA = [110.00, 164.81, 220.00, 261.63]; // A2, E3, A3, C4 (Am)
      let alternate = true;

      this.bgmInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const curTime = this.ctx.currentTime;
        const notes = alternate ? chordC : chordA;
        
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          // Spread trigger times slightly to sound like strumming
          const triggerTime = curTime + idx * 0.05;
          osc.frequency.setValueAtTime(freq, triggerTime);
          
          gain.gain.setValueAtTime(0.08, triggerTime);
          gain.gain.exponentialRampToValueAtTime(0.001, triggerTime + 1.8);
          
          osc.connect(gain);
          gain.connect(this.bgmGain);
          osc.start(triggerTime);
          osc.stop(triggerTime + 2.0);
        });
        
        alternate = !alternate;
      }, 2500);
    }
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmOscs.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (err) {}
    });
    this.bgmOscs = [];
    this.currentMood = null;
  }
}

// Export single instance
export default new AudioSynth();
