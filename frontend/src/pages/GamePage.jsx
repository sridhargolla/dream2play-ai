import React, { useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';

export default function GamePage({ dream, onBack, onSaveScore }) {
  // Dynamically set HTML data-theme attribute based on dream mood
  useEffect(() => {
    if (dream && dream.blueprint && dream.blueprint.mood) {
      const mood = dream.blueprint.mood.toLowerCase().replace('-', '');
      document.documentElement.setAttribute('data-theme', mood);
    }

    return () => {
      // Revert back to default theme
      document.documentElement.removeAttribute('data-theme');
    };
  }, [dream]);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Page Title & Breadcrumb */}
      <div className="text-left">
        <h2 className="text-3xl font-black text-white font-[var(--title-font)] uppercase flex items-center gap-3">
          <span className="text-[var(--accent-color)] neon-text-glow">{dream.blueprint.mood} SIMULATOR</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono font-normal">
            G_ID: {dream.id}
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl font-medium">
          Dream Description: "{dream.description}"
        </p>
      </div>

      {/* Phaser Wrapper */}
      <GameCanvas 
        dream={dream} 
        onBack={onBack} 
        onSaveScore={onSaveScore} 
      />
    </div>
  );
}
