import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';

export const languages = [
  ['en', 'English'],
  ['te', 'Telugu (తెలుగు)'],
  ['hi', 'Hindi (हिन्दी)'],
];

const resources = {
  en: { translation: en },
  te: { translation: te },
  hi: { translation: hi },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('dream2play_language') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('dream2play_language', lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = 'ltr';
});

export default i18n;
