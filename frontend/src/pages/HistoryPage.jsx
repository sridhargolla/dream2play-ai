import React, { useState } from 'react';
import { Play, Trash2, GitMerge, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

export default function HistoryPage({ dreams, onDeleteDream, onPlayDream, onFuseDreams }) {
  const [selectedForFusion, setSelectedForFusion] = useState([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionError, setFusionError] = useState('');

  const handleCheckboxChange = (dreamId) => {
    if (selectedForFusion.includes(dreamId)) {
      setSelectedForFusion((prev) => prev.filter((id) => id !== dreamId));
    } else {
      if (selectedForFusion.length >= 2) {
        // limit to 2
        setSelectedForFusion((prev) => [prev[1], dreamId]);
      } else {
        setSelectedForFusion((prev) => [...prev, dreamId]);
      }
    }
  };

  const handleFuse = async () => {
    if (selectedForFusion.length !== 2) return;
    setIsFusing(true);
    setFusionError('');
    try {
      await onFuseDreams(selectedForFusion[0], selectedForFusion[1]);
      setSelectedForFusion([]);
    } catch (err) {
      setFusionError(err.message || 'Dream fusion failed');
    } finally {
      setIsFusing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 px-4 py-8 text-left">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-black text-white font-[var(--title-font)] uppercase flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-[var(--accent-color)]" />
          COGNITIVE DREAM LOGS
        </h2>
        <p className="text-xs text-gray-400 max-w-xl font-medium">
          A historical record of all your compiled dreams. Select two logs to synthesize a hybrid dimension.
        </p>
      </div>

      {/* Dream Fusion Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-[var(--accent-color)]/20 bg-gradient-to-br from-[var(--bg-secondary)]/50 to-black/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-glow)] rounded-full filter blur-2xl pointer-events-none opacity-30" />

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <GitMerge className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-[var(--title-font)] flex items-center gap-1.5">
              Dream Fusion Chamber
            </h4>
            <p className="text-gray-400 max-w-lg leading-relaxed">
              Toggle checkboxes on any two dreams below to merge their variables (physics, enemies, storylines) into a
              hybrid game.
            </p>
            {selectedForFusion.length > 0 && (
              <span className="text-[var(--accent-color)] font-bold uppercase tracking-wider mt-1">
                Selected: {selectedForFusion.length} / 2 dreams
              </span>
            )}
            {fusionError && (
              <span className="text-red-400 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fusionError}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleFuse}
          disabled={selectedForFusion.length !== 2 || isFusing}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl text-xs tracking-wider transition-all disabled:opacity-30 disabled:hover:bg-purple-600 shadow-md shadow-purple-950 border border-purple-500/30 flex items-center gap-2 cursor-pointer font-[var(--title-font)]"
        >
          <Sparkles className="w-4 h-4" />
          {isFusing ? 'FUSING MATRIX...' : 'FUSE CHOSEN DREAMS'}
        </button>
      </div>

      {/* Grid of logs */}
      {dreams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dreams.map((dream) => {
            const isSelected = selectedForFusion.includes(dream.id);
            return (
              <div
                key={dream.id}
                className={`glass-panel rounded-2xl border transition-all duration-300 p-6 flex flex-col gap-4 relative ${
                  isSelected
                    ? 'border-purple-500 shadow-lg shadow-purple-950/20 bg-purple-500/[0.02]'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                }`}
              >
                {/* Checkbox for Fusion */}
                <div className="absolute top-5 right-5 flex items-center">
                  <input
                    type="checkbox"
                    id={`checkbox-${dream.id}`}
                    checked={isSelected}
                    onChange={() => handleCheckboxChange(dream.id)}
                    className="w-4 h-4 text-purple-600 border-white/10 rounded focus:ring-purple-500 bg-white/5 transition cursor-pointer"
                  />
                </div>

                {/* Body details */}
                <div className="flex flex-col gap-2 pr-6">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/10 text-gray-300">
                      {dream.blueprint.mood}
                    </span>
                    {dream.isFused && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/20">
                        Fused
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-white text-base leading-snug line-clamp-1">{dream.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mt-1 font-medium">
                    {dream.description}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 mt-auto flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono">
                    {new Date(dream.createdAt).toLocaleDateString()} at{' '}
                    {new Date(dream.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteDream(dream.id)}
                      className="p-2.5 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete Dream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onPlayDream(dream)}
                      className="px-4 py-2.5 rounded-lg bg-[var(--accent-color)] hover:opacity-95 text-white text-xs font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      PLAY
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-16 rounded-2xl text-center border border-dashed border-white/10 text-gray-400 text-sm">
          Your dream log is empty. Head to the generator, record your dreams, and they will be archived here.
        </div>
      )}
    </div>
  );
}
