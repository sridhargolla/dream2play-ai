import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/GameConfig';
import { RotateCcw, Award, ShieldAlert, Sparkles, BookOpen, Clock, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GameCanvas({ dream, onBack, onSaveScore }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'win', 'lose'
  const [gameStats, setGameStats] = useState({ score: 0, completionTime: 0 });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !dream) return;

    // Reset local UI states
    setGameState('playing');
    setGameStats({ score: 0, completionTime: 0 });
    setScoreSubmitted(false);

    // Callbacks to communicate with React
    const handleWin = (stats) => {
      setGameStats(stats);
      setGameState('win');
      // Fire celebration confetti!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    };

    const handleLose = (stats) => {
      setGameStats(stats);
      setGameState('lose');
    };

    const config = createGameConfig(containerRef.current, dream.blueprint, handleWin, handleLose);
    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [dream]);

  const handleRestart = () => {
    setGameState('playing');
    setScoreSubmitted(false);
    
    // Destroy previous game and rebuild
    if (gameRef.current) {
      gameRef.current.destroy(true);
    }
    
    const config = createGameConfig(
      containerRef.current, 
      dream.blueprint, 
      (stats) => {
        setGameStats(stats);
        setGameState('win');
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }, 
      (stats) => {
        setGameStats(stats);
        setGameState('lose');
      }
    );
    gameRef.current = new Phaser.Game(config);
  };

  const handleSubmitScore = async () => {
    if (scoreSubmitted || isSubmittingScore) return;
    setIsSubmittingScore(true);
    try {
      await onSaveScore({
        score: gameStats.score,
        completionTime: gameStats.completionTime,
        difficulty: dream.blueprint.difficulty,
        dreamTitle: dream.title
      });
      setScoreSubmitted(true);
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Control Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 bg-white/5 transition-all cursor-pointer font-bold uppercase tracking-wider"
        >
          &larr; Exit Canvas
        </button>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1 text-[var(--accent-color)]">
            <span className="font-bold">MOOD:</span> {dream.blueprint.mood}
          </div>
          <div className="flex items-center gap-1 text-[var(--secondary-color)]">
            <span className="font-bold">HERO:</span> {dream.blueprint.hero}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Playable Game Window */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative aspect-[16/9] bg-black">
            {/* Phaser Mounting Element */}
            <div ref={containerRef} className="w-full h-full" />

            {/* REACT GAME STATE OVERLAYS */}
            {gameState !== 'playing' && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-fade-in">
                <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/10 text-center flex flex-col gap-6 relative">
                  
                  {gameState === 'win' ? (
                    <>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-full text-yellow-400 animate-float">
                        <Award className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-black text-yellow-400 tracking-wider font-[var(--title-font)] uppercase pt-4">
                        Victory Achieved!
                      </h2>
                      <p className="text-xs text-gray-300 italic">
                        "{dream.blueprint.stories.ending}"
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 p-3 rounded-full text-red-500 animate-pulse">
                        <ShieldAlert className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-black text-red-500 tracking-wider font-[var(--title-font)] uppercase pt-4">
                        Dream Collapsed
                      </h2>
                      <p className="text-xs text-gray-400 italic">
                        The nightmare proved too strong. The dream state dissolved.
                      </p>
                    </>
                  )}

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Total Score</span>
                      <span className="text-2xl font-black text-white">{gameStats.score}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Survival Time</span>
                      <span className="text-2xl font-black text-white flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {gameStats.completionTime}s
                      </span>
                    </div>
                  </div>

                  {/* Leaderboard Post Form */}
                  {gameState === 'win' && !scoreSubmitted && (
                    <button
                      onClick={handleSubmitScore}
                      disabled={isSubmittingScore}
                      className="w-full py-3 rounded-xl font-bold bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isSubmittingScore ? 'SUBMITTING...' : 'POST SCORE TO LEADERBOARD'}
                    </button>
                  )}

                  {scoreSubmitted && (
                    <div className="text-xs text-green-400 font-bold border border-green-500/20 bg-green-500/5 py-2.5 rounded-lg">
                      SCORE SUBMITTED SUCCESSFULLY!
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestart}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wider bg-white/5 border border-white/10 hover:border-white/20 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      REPLAY
                    </button>
                    <button
                      onClick={onBack}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wider bg-[var(--accent-color)] hover:opacity-95 text-white transition-all cursor-pointer"
                    >
                      DASHBOARD
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-3">
            CONTROLS: Use Left/Right Arrow to Move | Up Arrow to Jump / Jetpack | Spacebar to Shoot
          </span>
        </div>

        {/* Game Details Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-[var(--title-font)]">
              <BookOpen className="w-4 h-4 text-[var(--accent-color)]" />
              GAME BLUEPRINT
            </h3>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">World Theme</span>
                <span className="font-bold text-white">{dream.blueprint.world}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Hero Character</span>
                <span className="font-bold text-white">{dream.blueprint.hero}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Enemies</span>
                <span className="font-bold text-white">{dream.blueprint.enemies.join(', ')}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Boss Deity</span>
                <span className="font-bold text-white text-red-400">{dream.blueprint.boss}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Difficulty Setting</span>
                <span className="font-bold text-yellow-400 uppercase tracking-wider">{dream.blueprint.difficulty}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400">Core Objective</span>
                <p className="text-white bg-white/5 p-2.5 rounded-lg leading-relaxed border border-white/5">
                  {dream.blueprint.objective}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3 relative overflow-hidden bg-gradient-to-br from-[var(--bg-secondary)] to-black">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-color)]/5 rounded-full filter blur-xl pointer-events-none" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-[var(--title-font)]">Dream Storyline</h4>
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
              <p>{dream.blueprint.stories.intro}</p>
              <p className="font-semibold text-white border-l-2 border-[var(--accent-color)] pl-2">{dream.blueprint.stories.mission}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
