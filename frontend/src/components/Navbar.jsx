import React from 'react';
import { Gamepad2, Compass, LayoutDashboard, History, User2, LogOut, Moon, Sun } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, user, onLogout, theme, toggleMute, isMuted }) {
  return (
    <nav className="glass-panel border-b border-white/10 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setActivePage('landing')}
      >
        <Gamepad2 className="w-8 h-8 text-[var(--accent-color)] animate-float" />
        <span className="text-xl font-black tracking-wider text-[var(--accent-color)] neon-text-glow font-[var(--title-font)] uppercase">
          Dream2Play AI
        </span>
      </div>

      {/* Navigation Links */}
      {user && (
        <div className="hidden md:flex items-center gap-1 font-semibold text-sm">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activePage === 'dashboard' 
                ? 'bg-[var(--accent-color)]/25 text-white border border-[var(--accent-color)]/50' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActivePage('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activePage === 'generator' 
                ? 'bg-[var(--accent-color)]/25 text-white border border-[var(--accent-color)]/50' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            Dream Engine
          </button>
          
          <button
            onClick={() => setActivePage('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activePage === 'history' 
                ? 'bg-[var(--accent-color)]/25 text-white border border-[var(--accent-color)]/50' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            Dream Logs
          </button>
          
          <button
            onClick={() => setActivePage('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activePage === 'profile' 
                ? 'bg-[var(--accent-color)]/25 text-white border border-[var(--accent-color)]/50' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User2 className="w-4 h-4" />
            Leaderboard
          </button>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className="px-3 py-1.5 rounded-md text-xs font-bold border border-white/10 hover:border-[var(--accent-color)] text-gray-400 hover:text-white transition-all bg-white/5"
            >
              {isMuted ? 'UNMUTE SOUND' : 'MUTE SOUND'}
            </button>

            {/* Profile Dropdown / Logout */}
            <div className="hidden lg:flex flex-col items-end text-xs">
              <span className="font-bold text-gray-300">Welcome, {user.username}</span>
              <span className="text-[var(--accent-color)] font-semibold uppercase tracking-wider text-[9px]">{theme || 'Default'} Mode</span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActivePage('landing')}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-color)] text-white hover:opacity-95 shadow-md hover:shadow-[var(--accent-color)]/30 border border-[var(--accent-color)]/20 transition-all"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </nav>
  );
}
