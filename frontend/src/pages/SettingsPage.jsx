import React, { useState, useEffect } from 'react';
import { Bell, Languages, Moon, Cpu, Key, Globe, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n';
import { getAISettings, saveAISettings, PROVIDER_DEFAULTS } from '../utils/aiSettings';

const MODEL_SUGGESTIONS = {
  openai: ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o'],
  ollama: ['llama3', 'mistral', 'qwen2', 'deepseek'],
  local: ['local-model'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro']
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dream2play_dark_mode') !== 'false');
  const [notifications, setNotifications] = useState(localStorage.getItem('dream2play_notifications') !== 'false');

  // AI Provider State
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [endpoint, setEndpoint] = useState('https://api.openai.com');
  
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const settings = getAISettings();
    setProvider(settings.provider);
    setApiKey(settings.apiKey);
    setModel(settings.model);
    setEndpoint(settings.endpoint);
  }, []);

  const updateDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('dream2play_dark_mode', String(next));
  };

  const updateNotifications = () => {
    const next = !notifications;
    setNotifications(next);
    localStorage.setItem('dream2play_notifications', String(next));
  };

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setProvider(newProv);
    const defaults = PROVIDER_DEFAULTS[newProv] || {};
    setModel(defaults.model || '');
    setEndpoint(defaults.endpoint || '');
    setTestResult(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveAISettings({ provider, apiKey, model, endpoint });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          aiConfig: { provider, apiKey, model, endpoint }
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: `${t('connectionOk', 'Connection successful!')} (${data.latency}ms)`
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || t('connectionFailed', 'Connection failed')
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const showApiKeyField = provider === 'openai' || provider === 'anthropic' || provider === 'gemini' || provider === 'local';
  const showEndpointField = provider === 'ollama' || provider === 'local';

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="text-left flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white font-[var(--title-font)]">{t('settings')}</h2>
          <p className="text-sm text-gray-400 mt-2">{t('savedLanguage')}</p>
        </div>
      </div>

      {/* AI Settings Section */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 border border-white/5">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Cpu className="w-5 h-5 text-[var(--accent-color)]" />
          <h3 className="text-lg font-extrabold text-white font-[var(--title-font)]">
            {t('aiProviderSettings', 'AI Inference & Provider Settings')}
          </h3>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Selector */}
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--accent-color)]" />
                {t('aiProvider', 'AI Provider')}
              </span>
              <select
                value={provider}
                onChange={handleProviderChange}
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)] transition-all font-semibold"
              >
                <option value="openai" className="bg-slate-950 text-white">{t('provider_openai', 'OpenAI')}</option>
                <option value="ollama" className="bg-slate-950 text-white">{t('provider_ollama', 'Ollama (Local)')}</option>
                <option value="local" className="bg-slate-950 text-white">{t('provider_local', 'Local OpenAI Compatible')}</option>
                <option value="anthropic" className="bg-slate-950 text-white">{t('provider_anthropic', 'Anthropic Claude')}</option>
                <option value="gemini" className="bg-slate-950 text-white">{t('provider_gemini', 'Google Gemini')}</option>
              </select>
            </label>

            {/* Model Input */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--secondary-color)]" />
                {t('aiModel', 'AI Model')}
              </span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model name"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)] transition-all font-mono"
              />
              {MODEL_SUGGESTIONS[provider] && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MODEL_SUGGESTIONS[provider].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all border ${
                        model === m
                          ? 'bg-[var(--accent-color)]/20 border-[var(--accent-color)] text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Endpoint field (for Ollama/Local) */}
            {showEndpointField && (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  {t('aiEndpoint', 'Endpoint URL')}
                </span>
                <input
                  type="text"
                  required
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="e.g. http://localhost:11434"
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)] transition-all font-mono"
                />
              </label>
            )}

            {/* API Key field */}
            {showApiKeyField && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-400" />
                  {t('aiKey', 'API Key')}
                  {provider !== 'local' && <span className="text-[10px] text-gray-500 normal-case">({t('byokHint', 'Stored locally')})</span>}
                  {provider === 'local' && <span className="text-[10px] text-gray-500 normal-case">({t('optional', 'Optional')})</span>}
                </span>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === 'local' ? 'Optional credentials' : 'sk-proj-...'}
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test results indicator */}
          {testResult && (
            <div
              className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Connection Test & Save buttons */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="px-5 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-sm font-bold text-white flex items-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
              ) : (
                <RefreshCw className="w-4 h-4 text-gray-400" />
              )}
              {t('testConnection', 'Test Connection')}
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] text-sm font-bold text-white hover:opacity-95 transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer"
            >
              {t('saveSettings', 'Save Settings')}
            </button>

            {saveSuccess && (
              <span className="flex items-center text-xs font-semibold text-emerald-400 animate-pulse transition-all ml-2">
                ✓ {t('settingsSaved', 'Settings saved successfully!')}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* General Settings Section */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 border border-white/5">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Languages className="w-5 h-5 text-[var(--accent-color)]" />
          <h3 className="text-lg font-extrabold text-white font-[var(--title-font)]">
            {t('generalSettings', 'General Settings')}
          </h3>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Languages className="w-4 h-4 text-[var(--accent-color)]" />
            {t('language')}
          </span>
          <select
            value={i18n.language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)] transition-all font-semibold"
          >
            {languages.map(([code, name]) => (
              <option key={code} value={code} className="bg-slate-950 text-white">
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={updateDarkMode}
          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Moon className="w-4 h-4 text-[var(--secondary-color)]" />
            {t('darkMode')}
          </span>
          <span className={`h-6 w-11 rounded-full p-1 transition-all ${darkMode ? 'bg-[var(--accent-color)]' : 'bg-gray-700'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition-transform duration-350 ${darkMode ? 'translate-x-5' : ''}`} />
          </span>
        </button>

        <button
          onClick={updateNotifications}
          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-400" />
            {t('notifications')}
          </span>
          <span className={`h-6 w-11 rounded-full p-1 transition-all ${notifications ? 'bg-[var(--accent-color)]' : 'bg-gray-700'}`}>
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform duration-350 ${
                notifications ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
