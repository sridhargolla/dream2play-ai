import React from 'react';
import { Award, Trophy, Clock, Zap, User, Star } from 'lucide-react';

export default function ProfilePage({ user, scores }) {
  // Take top 10 scores for global leaderboard
  const globalLeaderboard = scores.slice(0, 10);

  // Take user-specific scores
  const userScores = scores.filter((s) => s.userId === user.id);
  const totalCompleted = userScores.length;
  const bestScore = userScores.length > 0 ? Math.max(...userScores.map((s) => s.score)) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 px-4 py-8 text-left">
      {/* Page Title */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-black text-white font-[var(--title-font)] uppercase flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-400 animate-float" />
          LEADERBOARD & ARCHIVE
        </h2>
        <p className="text-xs text-gray-400 max-w-xl font-medium">
          Check out the global rankings, top scores across all synthesized dimensions, and your active badge
          progression.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Leaderboard Table */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-[var(--title-font)] flex items-center gap-2">
            Global Standings
          </h3>

          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 text-center">Rank</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4">Dream Title</th>
                    <th className="px-6 py-4 text-center">Difficulty</th>
                    <th className="px-6 py-4 text-right">Score</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {globalLeaderboard.length > 0 ? (
                    globalLeaderboard.map((scoreItem, idx) => {
                      const rank = idx + 1;
                      const isSelf = scoreItem.userId === user.id;

                      let rankBadge = '';
                      if (rank === 1) rankBadge = '🥇';
                      else if (rank === 2) rankBadge = '🥈';
                      else if (rank === 3) rankBadge = '🥉';
                      else rankBadge = `#${rank}`;

                      return (
                        <tr
                          key={scoreItem.id}
                          className={`hover:bg-white/[0.02] transition-all ${
                            isSelf ? 'bg-[var(--accent-color)]/5 border-l-2 border-l-[var(--accent-color)]' : ''
                          }`}
                        >
                          <td className="px-6 py-4 text-center font-bold text-sm">{rankBadge}</td>
                          <td className="px-6 py-4 font-bold text-white">
                            {scoreItem.username}{' '}
                            {isSelf && (
                              <span className="text-[10px] text-[var(--accent-color)] font-normal ml-1">(You)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-300 max-w-[180px] truncate">{scoreItem.dreamTitle}</td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase ${
                                scoreItem.difficulty === 'Hard'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : scoreItem.difficulty === 'Medium'
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                              }`}
                            >
                              {scoreItem.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-white text-sm">{scoreItem.score}</td>
                          <td className="px-6 py-4 text-right text-gray-400 font-mono">{scoreItem.completionTime}s</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                        No high scores submitted yet. Become the first by completing a game!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Mini profile stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-[var(--title-font)] flex items-center gap-2">
            My Terminal Profile
          </h3>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm">{user.username}</span>
                <span className="text-[10px] text-gray-500 font-mono">{user.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-400 uppercase font-bold">Games Cleared</span>
                <h4 className="text-xl font-black text-white mt-1">{totalCompleted}</h4>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-400 uppercase font-bold">Personal Best</span>
                <h4 className="text-xl font-black text-white mt-1">{bestScore} pts</h4>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  Active Tier
                </span>
                <span className="font-bold text-[var(--accent-color)]">
                  {totalCompleted >= 5
                    ? 'Master Architect'
                    : totalCompleted >= 2
                      ? 'Novice Weaver'
                      : 'Synthesizer Trainee'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
