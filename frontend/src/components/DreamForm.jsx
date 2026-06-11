import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Mic, MicOff, Play, Sparkles, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const speechLocales = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  ur: 'ur-IN',
};

export default function DreamForm({ onSubmit, isGenerating }) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('user_openai_key') || '');
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logIndex, setLogIndex] = useState(0);
  const [formError, setFormError] = useState('');
  const recognitionRef = useRef(null);

  const compilationLogs = [
    t('generating'),
    t('blueprintPreview'),
    t('gameBlueprint'),
    `${t('boss')} HP: 200`,
    t('objective'),
    t('loading'),
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = speechLocales[i18n.language] || 'en-US';
    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setDescription((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, [i18n.language]);

  useEffect(() => {
    if (isGenerating) {
      setLogs([compilationLogs[0]]);
      setLogIndex(1);
    } else {
      setLogs([]);
      setLogIndex(0);
    }
  }, [isGenerating, i18n.language]);

  useEffect(() => {
    if (!isGenerating || logIndex >= compilationLogs.length) return undefined;
    const timer = setTimeout(() => {
      setLogs((prev) => [...prev, compilationLogs[logIndex]]);
      setLogIndex((prev) => prev + 1);
    }, 700);
    return () => clearTimeout(timer);
  }, [isGenerating, logIndex, i18n.language]);

  const handleKeyChange = (e) => {
    setOpenaiKey(e.target.value);
    localStorage.setItem('user_openai_key', e.target.value);
  };

  const toggleListening = (e) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      setFormError('Speech recognition is not supported in this browser.');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!title || !description) {
      setFormError(t('fieldsError'));
      return;
    }
    if (isListening) recognitionRef.current?.stop();
    onSubmit({ title, description, openaiKey });
  };

  if (isGenerating) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl flex flex-col gap-5 border border-[var(--accent-color)]/30 relative overflow-hidden bg-black/85">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-[var(--accent-color)]" />
              {t('generating')}
            </h3>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-color)]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-color)] opacity-75" />
            </span>
          </div>
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-green-400 leading-relaxed min-h-[200px] flex flex-col gap-2 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={`${log}-${idx}`} className="flex gap-2 items-start">
                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                <span className={idx === logs.length - 1 ? 'text-white font-bold animate-pulse' : ''}>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-color)] to-transparent animate-pulse" />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2 font-[var(--title-font)]">
            <Sparkles className="w-6 h-6 text-[var(--accent-color)]" />
            {t('navGenerator')}
          </h2>
          <p className="text-xs text-gray-400">{t('heroCopy')}</p>
        </div>

        {formError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{t('dreamTitle')}</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('dreamPlaceholder')}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-500 transition-all font-semibold"
          />
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{t('dreamDescription')}</label>
            <button
              onClick={toggleListening}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-[var(--accent-color)] hover:text-white'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isListening ? t('loading') : t('language')}
            </button>
          </div>
          <textarea
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-500 transition-all leading-relaxed font-medium"
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('apiKey')}</label>
          <input
            type="password"
            value={openaiKey}
            onChange={handleKeyChange}
            placeholder="sk-proj-..."
            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[var(--accent-color)] text-white placeholder-gray-600 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full mt-2 bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] text-white py-4 px-6 rounded-xl font-bold tracking-wider hover:opacity-95 shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2 transition-all cursor-pointer font-[var(--title-font)]"
        >
          <Play className="w-5 h-5 fill-white" />
          {t('generateGame')}
        </button>
      </form>
    </div>
  );
}
