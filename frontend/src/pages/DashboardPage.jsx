import React from 'react';
import { Compass, Sparkles, Gamepad2, Award, History, Activity, Zap, Play } from 'lucide-react';

export default function DashboardPage({ user, dreams, scores, setActivePage, setSelectedDream, onOpenPreview }) {
  // Compute user statistics
  const totalGames = dreams.length;
  const userScores = scores.filter((s) => s.userId === user.id);
  const maxScore = userScores.length > 0 ? Math.max(...userScores.map((s) => s.score)) : 0;

  // Calculate badges unlocked based on achievements
  const badges = [
    { name: 'Dreamweaver Novice', desc: 'Synthesized your first dream game', unlocked: totalGames >= 1 },
    { name: 'Dream Lord', desc: 'Synthesized 5 or more games', unlocked: totalGames >= 5 },
    { name: 'Synth Maestro', desc: 'Scored 100+ points in a single session', unlocked: maxScore >= 100 },
    { name: 'Void Walker', desc: 'Synthesized a Fused hybrid dream', unlocked: dreams.some((d) => d.isFused) },
  ];

  const recentDreams = dreams.slice().reverse().slice(0, 3); // Last 3 dreams

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 px-4 py-8">
      {/* Header Welcome Card */}
      <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-[var(--bg-secondary)] to-black">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-glow)] rounded-full filter blur-3xl pointer-events-none opacity-40" />

        <div className="flex flex-col gap-1.5 text-left z-10">
          <h2 className="text-3xl font-black text-white font-[var(--title-font)]">WELCOME TO YOUR COGNITIVE DOCK</h2>
          <p className="text-gray-400 text-sm font-medium">
            Agent <span className="text-white font-bold">{user.username}</span>, your dream synthesis nodes are fully
            calibrated.
          </p>
        </div>

        <button
          onClick={() => setActivePage('generator')}
          className="bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] text-white px-6 py-3 rounded-xl text-sm font-bold tracking-wider hover:opacity-95 shadow-lg shadow-[var(--accent-glow)] flex items-center gap-2 transition-all cursor-pointer font-[var(--title-font)] z-10"
        >
          <Compass className="w-4 h-4" />
          SYNTHESIZE NEW DREAM
        </button>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border border-white/5 bg-white/5">
          <div className="p-3.5 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Games Synthesized</span>
            <h3 className="text-3xl font-black text-white mt-0.5">{totalGames}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border border-white/5 bg-white/5">
          <div className="p-3.5 rounded-xl bg-[var(--secondary-color)]/10 text-[var(--secondary-color)]">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">High Score Record</span>
            <h3 className="text-3xl font-black text-white mt-0.5">{maxScore} pts</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border border-white/5 bg-white/5">
          <div className="p-3.5 rounded-xl bg-yellow-500/10 text-yellow-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Achievements Unlocked</span>
            <h3 className="text-3xl font-black text-white mt-0.5">
              {badges.filter((b) => b.unlocked).length} / {badges.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Main dashboard columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        {/* Left Column: Recent Dreams */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2 font-[var(--title-font)]">
              <History className="w-5 h-5 text-[var(--accent-color)]" />
              RECENT DREAMS
            </h3>
            {totalGames > 3 && (
              <button
                onClick={() => setActivePage('history')}
                className="text-xs text-[var(--accent-color)] font-bold hover:underline"
              >
                View all logs
              </button>
            )}
          </div>

          {recentDreams.length > 0 ? (
            <div className="flex flex-col gap-4">
              {recentDreams.map((dream) => (
                <div
                  key={dream.id}
                  className="glass-panel p-5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4 glass-panel-hover"
                >
                  <div className="flex flex-col gap-1 select-none">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{dream.title}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/10 text-gray-300">
                        {dream.blueprint.mood}
                      </span>
                      {dream.isFused && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Fused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 max-w-lg line-clamp-1 leading-relaxed">{dream.description}</p>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                      CREATED: {new Date(dream.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => (onOpenPreview ? onOpenPreview(dream) : (setSelectedDream(dream), setActivePage('preview')))}
                    className="p-2.5 rounded-lg bg-[var(--accent-color)] hover:opacity-95 text-white transition-all shadow-md cursor-pointer"
                    title="Play Game"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-xl text-center border border-dashed border-white/10 text-gray-400 text-sm">
              No games generated yet. Head over to the Dream Engine tab to start!
            </div>
          )}
        </div>

        {/* Right Column: Badges & Profile Rank */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <h3 className="text-lg font-black text-white flex items-center gap-2 font-[var(--title-font)]">
            <Activity className="w-5 h-5 text-[var(--secondary-color)]" />
            ACHIEVEMENT BADGES
          </h3>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                  badge.unlocked ? 'bg-white/5 border-white/10 opacity-100' : 'bg-black/20 border-white/5 opacity-40'
                }`}
              >
                <div
                  className={`p-2 rounded-lg font-black text-xs shrink-0 ${
                    badge.unlocked ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {badge.unlocked ? '★' : '☆'}
                </div>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className={`font-bold ${badge.unlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</span>
                  <span className="text-[10px] text-gray-400 leading-normal">{badge.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
