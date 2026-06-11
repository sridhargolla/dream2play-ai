import React, { useState } from 'react';
import { Bell, Languages, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dream2play_dark_mode') !== 'false');
  const [notifications, setNotifications] = useState(localStorage.getItem('dream2play_notifications') !== 'false');

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

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="text-left">
        <h2 className="text-3xl font-black text-white font-[var(--title-font)]">{t('settings')}</h2>
        <p className="text-sm text-gray-400 mt-2">{t('savedLanguage')}</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Languages className="w-4 h-4 text-[var(--accent-color)]" />
            {t('language')}
          </span>
          <select
            value={i18n.language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-color)]"
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
          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Moon className="w-4 h-4 text-[var(--secondary-color)]" />
            {t('darkMode')}
          </span>
          <span className={`h-6 w-11 rounded-full p-1 ${darkMode ? 'bg-[var(--accent-color)]' : 'bg-gray-700'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
          </span>
        </button>

        <button
          onClick={updateNotifications}
          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-400" />
            {t('notifications')}
          </span>
          <span className={`h-6 w-11 rounded-full p-1 ${notifications ? 'bg-[var(--accent-color)]' : 'bg-gray-700'}`}>
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
