import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import confetti from 'canvas-confetti';
import { Award, BookOpen, CheckCircle2, Clock, Crown, Layers, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createGameConfig } from '../game/GameConfig';

function safeJoin(items) {
  return Array.isArray(items) ? items.join(', ') : 'Dream shadows';
}

export default function GameCanvas({ dream, onBack, onSaveScore }) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState('playing');
  const [gameStats, setGameStats] = useState({ score: 0, completionTime: 0 });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [liveFeed, setLiveFeed] = useState([{ id: 'start', type: 'info', message: t('gameStarted') }]);

  const phaserLabels = {
    victory: t('victory'),
    levelCompleted: t('levelCompleted'),
    bossDefeated: t('bossDefeated'),
    finalScore: t('finalScore'),
    playAgain: t('playAgain'),
    bossAppeared: t('bossAppeared'),
    boss: t('boss'),
    enemies: t('enemies'),
    health: t('health'),
    score: t('score'),
    goal: t('goal'),
    loading: t('loading'),
  };

  const pushFeed = (type, message) => {
    setLiveFeed((prev) => [...prev.slice(-7), { id: `${Date.now()}-${Math.random()}`, type, message }]);
  };

  const buildGame = () => {
    if (!containerRef.current || !dream) return null;
    const config = createGameConfig(containerRef.current, dream.blueprint, {
      labels: phaserLabels,
      onWin: (stats) => {
        setGameStats(stats);
        setGameState('win');
        pushFeed('win', t('dreamCompleteFeed'));
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      },
      onLose: (stats) => {
        setGameStats(stats);
        setGameState('lose');
        pushFeed('lose', t('dreamCollapsed'));
      },
      onBossDefeated: ({ bossName, stageNumber, totalStages }) => {
        pushFeed('boss', `${t('bossDefeatedFeed')}: ${bossName} (${stageNumber}/${totalStages})`);
      },
      onStageComplete: ({ stageNumber, totalStages, environment, isFinalStage }) => {
        pushFeed(
          'stage',
          isFinalStage
            ? `${t('stageCompleteFeed')} ${stageNumber}/${totalStages}`
            : `${t('stageCompleteFeed')} ${stageNumber}/${totalStages} - ${environment || t('loading')}`
        );
      },
    });
    return new Phaser.Game(config);
  };

  useEffect(() => {
    if (!containerRef.current || !dream) return undefined;
    setGameState('playing');
    setGameStats({ score: 0, completionTime: 0 });
    setScoreSubmitted(false);
    setLiveFeed([{ id: 'start', type: 'info', message: t('gameStarted') }]);

    window.__dream2play_restart = handleRestart;

    gameRef.current = buildGame();
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      delete window.__dream2play_restart;
    };
  }, [dream, i18n.language]);

  const handleRestart = () => {
    setGameState('playing');
    setScoreSubmitted(false);
    setLiveFeed([{ id: 'restart', type: 'info', message: t('playAgain') }]);
    gameRef.current?.destroy(true);
    gameRef.current = buildGame();
  };

  const handleSubmitScore = async () => {
    if (scoreSubmitted || isSubmittingScore) return;
    setIsSubmittingScore(true);
    try {
      await onSaveScore({
        score: gameStats.score,
        completionTime: gameStats.completionTime,
        difficulty: dream.blueprint.difficulty,
        dreamTitle: dream.title,
      });
      setScoreSubmitted(true);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const bp = dream.blueprint;
  const stories = bp.stories || { intro: '', mission: '', ending: t('victory') };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 bg-white/5 transition-all cursor-pointer font-bold uppercase tracking-wider"
        >
          &larr; {t('exitCanvas')}
        </button>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="text-[var(--accent-color)]">
            <span className="font-bold">GENRE:</span> {(bp.genre || 'platformer').replace('_', ' ')}
          </div>
          <div className="text-[var(--secondary-color)]">
            <span className="font-bold">{t('hero')}:</span> {bp.hero || bp.player?.name}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative aspect-[16/9] bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {gameState !== 'playing' && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-fade-in">
                <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/10 text-center flex flex-col gap-6 relative">
                  {gameState === 'win' ? (
                    <>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-full text-yellow-400 animate-float">
                        <Award className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-black text-yellow-400 tracking-wider font-[var(--title-font)] uppercase pt-4">
                        {t('victory')}
                      </h2>
                      <p className="text-xs text-gray-300 italic">{stories.ending}</p>
                    </>
                  ) : (
                    <>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 p-3 rounded-full text-red-500 animate-pulse">
                        <ShieldAlert className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-black text-red-500 tracking-wider font-[var(--title-font)] uppercase pt-4">
                        {t('dreamCollapsed')}
                      </h2>
                      <p className="text-xs text-gray-400 italic">{t('tryAgain')}</p>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{t('finalScore')}</span>
                      <span className="text-2xl font-black text-white">{gameStats.score}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{t('survivalTime')}</span>
                      <span className="text-2xl font-black text-white flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {gameStats.completionTime}s
                      </span>
                    </div>
                  </div>

                  {gameState === 'win' && !scoreSubmitted && (
                    <button
                      onClick={handleSubmitScore}
                      disabled={isSubmittingScore}
                      className="w-full py-3 rounded-xl font-bold bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isSubmittingScore ? t('loading') : t('postScore')}
                    </button>
                  )}

                  {scoreSubmitted && (
                    <div className="text-xs text-green-400 font-bold border border-green-500/20 bg-green-500/5 py-2.5 rounded-lg">
                      {t('scoreSubmitted')}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestart}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wider bg-white/5 border border-white/10 hover:border-white/20 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('playAgain')}
                    </button>
                    <button
                      onClick={onBack}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wider bg-[var(--accent-color)] hover:opacity-95 text-white transition-all cursor-pointer"
                    >
                      {t('dashboard')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-3">{t('controls')}</span>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border border-[var(--accent-color)]/20">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-[var(--title-font)]">
              <Layers className="w-4 h-4 text-yellow-400" />
              {t('liveMissionFeed')}
            </h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {liveFeed.map((item) => (
                <div
                  key={item.id}
                  className={`text-[11px] px-3 py-2 rounded-lg border flex items-start gap-2 ${
                    item.type === 'boss'
                      ? 'bg-red-500/10 border-red-500/20 text-red-200'
                      : item.type === 'stage' || item.type === 'win'
                        ? 'bg-green-500/10 border-green-500/20 text-green-200'
                        : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                >
                  {item.type === 'boss' ? (
                    <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : item.type === 'stage' || item.type === 'win' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : null}
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-[var(--title-font)]">
              <BookOpen className="w-4 h-4 text-[var(--accent-color)]" />
              {t('gameBlueprint')}
            </h3>
            <div className="flex flex-col gap-3.5 text-xs">
              {[
                [t('world'), bp.world || bp.theme],
                [t('hero'), bp.hero || bp.player?.name],
                [t('enemies'), safeJoin(bp.enemies)],
                [t('boss'), bp.boss],
                [t('stages'), bp.stages?.length || 1],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-bold text-white text-right">{value}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <span className="text-gray-400">{t('objective')}</span>
                <p className="text-white bg-white/5 p-2.5 rounded-lg leading-relaxed border border-white/5">
                  {bp.objective}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3 relative overflow-hidden bg-gradient-to-br from-[var(--bg-secondary)] to-black">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-[var(--title-font)]">
              {t('dreamStoryline')}
            </h4>
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
              <p>{stories.intro}</p>
              <p className="font-semibold text-white border-l-2 border-[var(--accent-color)] pl-2">{stories.mission}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
