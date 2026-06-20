import {
  Compass,
  Gamepad2,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  User2,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { languages } from "../i18n";

export default function Navbar({
  activePage,
  setActivePage,
  user,
  onLogout,
  theme,
  toggleMute,
  isMuted,
}) {
  const { t, i18n } = useTranslation();
  const changeLanguage = (event) => i18n.changeLanguage(event.target.value);

  const navItems = [
    ["dashboard", t("navHome"), LayoutDashboard],
    ["generator", t("navGenerator"), Compass],
    ["history", t("navHistory"), History],
    ["profile", t("navProfile"), User2],
    ["settings", t("navSettings"), Settings],
  ];

  return (
    <nav className="glass-panel border-b border-white/10 sticky top-0 z-50 px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* Brand Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setActivePage("landing")}
        onKeyDown={(e) => e.key === "Enter" && setActivePage("landing")}
        role="button"
        tabIndex={0}
      >
        <Gamepad2 className="w-8 h-8 text-[var(--accent-color)] animate-float" />
        <span className="text-xl font-black tracking-wider text-[var(--accent-color)] neon-text-glow font-[var(--title-font)] uppercase">
          Dream2Play AI
        </span>
      </div>

      {/* Navigation Links */}
      {user && (
        <div className="order-3 w-full md:order-none md:w-auto flex flex-wrap items-center gap-1 font-semibold text-sm">
          {navItems.map(([page, label, Icon]) => (
            <button
              key={page}
              type="button"
              onClick={() => setActivePage(page)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                activePage === page
                  ? "bg-[var(--accent-color)]/25 text-white border border-[var(--accent-color)]/50"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="language-select">
          {t("language")}
        </label>
        <select
          id="language-select"
          value={i18n.language}
          onChange={changeLanguage}
          className="max-w-[132px] rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs font-bold text-white outline-none focus:border-[var(--accent-color)]"
          title={t("language")}
        >
          {languages.map(([code, name]) => (
            <option key={code} value={code} className="bg-slate-950 text-white">
              {name}
            </option>
          ))}
        </select>
        {user ? (
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className="px-3 py-1.5 rounded-md text-xs font-bold border border-white/10 hover:border-[var(--accent-color)] text-gray-400 hover:text-white transition-all bg-white/5"
            >
              {isMuted ? t("soundOff") : t("soundOn")}
            </button>

            {/* Profile Dropdown / Logout */}
            <div className="hidden lg:flex flex-col items-end text-xs">
              <span className="font-bold text-gray-300">
                {t("welcome")}, {user.username}
              </span>
              <span className="text-[var(--accent-color)] font-semibold uppercase tracking-wider text-[9px]">
                {theme || "Default"} Mode
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30"
              title={t("logout")}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePage("landing")}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-color)] text-white hover:opacity-95 shadow-md hover:shadow-[var(--accent-color)]/30 border border-[var(--accent-color)]/20 transition-all"
          >
            {t("login")} / {t("register")}
          </button>
        )}
      </div>
    </nav>
  );
}
