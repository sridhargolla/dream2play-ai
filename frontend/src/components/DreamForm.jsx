import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Terminal, Play, AlertCircle } from 'lucide-react';

export default function DreamForm({ onSubmit, isGenerating }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('user_openai_key') || '');
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logIndex, setLogIndex] = useState(0);
  const recognitionRef = useRef(null);

  // Load custom logs when generating
  const compilationLogs = [
    'Initializing Neural Dream Compiler v1.0.4...',
    'Reading user prompt and locking requested theme...',
    'Generating strict staged Blueprint JSON...',
    'Validating enemies, bosses, defeat states, and stage completion logic...',
    'Generating playable game object projection...',
    'Synthesizing player physics and progression gates...',
    'Initiating parallel AI image synthesis engines...',
    'Generating theme-specific hero, enemy, boss, collectible, and background assets...',
    'Saving generated assets to local database storage...',
    'Calibrating AudioSynth oscillators & sound effects...',
    'Rendering playable staged game...'
  ];

  // OpenAI Key handling
  const handleKeyChange = (e) => {
    const key = e.target.value;
    setOpenaiKey(key);
    localStorage.setItem('user_openai_key', key);
  };

  // Browser Web Speech API Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setDescription(prev => prev + (prev ? ' ' : '') + transcript);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = (e) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Compile logs loop
  useEffect(() => {
    if (isGenerating) {
      setLogs([compilationLogs[0]]);
      setLogIndex(1);
    } else {
      setLogs([]);
      setLogIndex(0);
    }
  }, [isGenerating]);

  useEffect(() => {
    if (isGenerating && logIndex < compilationLogs.length) {
      const delay = logIndex === 2 ? 1500 : 700; // Give NLP extraction slightly longer
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, compilationLogs[logIndex]]);
        setLogIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, logIndex]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) return;
    if (isListening) {
      recognitionRef.current.stop();
    }
    onSubmit({ title, description, openaiKey });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!isGenerating ? (
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
          {/* Scanning line for futuristic vibe */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-color)] to-transparent animate-pulse" />

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2 font-[var(--title-font)]">
              <Sparkles className="w-6 h-6 text-[var(--accent-color)]" />
              DREAM DECODING TERMINAL
            </h2>
            <p className="text-xs text-gray-400">
              Input details of your dream. The AI will translate them into playable gravity, sound frequencies, and custom assets.
            </p>
          </div>

          {/* Dream Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Dream Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flight through the Neon Sky"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-500 transition-all font-semibold"
            />
          </div>

          {/* Dream Description & Microphone */}
          <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Describe your dream</label>
              <button
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-[var(--accent-color)] hover:text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    LISTENING...
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    USE VOICE INPUT
                  </>
                )}
              </button>
            </div>
            
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your dream... e.g. I was flying over a futuristic city being chased by cybernetic dragons. I collected glowing plasma shards to build up my laser weapon and defeated the giant mechanical dragon lord at the terminal station."
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-500 transition-all leading-relaxed font-medium"
            />
          </div>

          {/* Optional OpenAI API Override Key */}
          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                OpenAI API Key (Optional)
              </label>
              <span className="text-[10px] text-gray-500 font-semibold">Provides smarter AI blueprints</span>
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={handleKeyChange}
              placeholder="sk-proj-..."
              className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-600 transition-all font-mono"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] text-white py-4 px-6 rounded-xl font-bold tracking-wider hover:opacity-95 shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2 transition-all cursor-pointer font-[var(--title-font)]"
          >
            <Play className="w-5 h-5 fill-white" />
            SYNTHESIZE PLAYABLE GAME
          </button>
        </form>
      ) : (
        /* Compilation Terminal Screen */
        <div className="glass-panel p-8 rounded-2xl flex flex-col gap-5 border border-[var(--accent-color)]/30 relative overflow-hidden bg-black/85">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-[var(--accent-color)]" />
              DREAM_COMPILE.SH - COMPILING DREAM BLUEPRINT
            </h3>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-color)]"></span>
            </span>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-green-400 leading-relaxed min-h-[200px] flex flex-col gap-2 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                <span className={idx === logs.length - 1 ? 'text-white font-bold animate-pulse' : ''}>{log}</span>
              </div>
            ))}
            {logIndex < compilationLogs.length && (
              <div className="text-gray-500 animate-pulse">Running compilation matrix...</div>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 mt-2">
            Estimated compilation time: ~8–12 seconds. Do not close this browser tab.
          </div>
        </div>
      )}
    </div>
  );
}
