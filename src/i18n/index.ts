import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import ar from './ar.json';
import zgh from './zgh.json';

export const languages = ['fr', 'ar', 'zgh'] as const;
export type Language = (typeof languages)[number];
export const LANGUAGE_KEY = 'idammen_lang';

function storedLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return (languages as readonly string[]).includes(saved ?? '') ? (saved as Language) : null;
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, ar: { translation: ar }, zgh: { translation: zgh } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export function applyLanguage(lng: Language) {
  void i18n.changeLanguage(lng);
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_KEY, lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
}

/** Applies the visitor's saved language on the client (SSR renders French first). */
export function applyStoredLanguage() {
  const saved = storedLanguage();
  if (saved) applyLanguage(saved);
}

export default i18n;
