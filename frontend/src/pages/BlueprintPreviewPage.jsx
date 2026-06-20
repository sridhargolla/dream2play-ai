import {
  ArrowLeft,
  Crown,
  Gamepad2,
  Layers,
  MapPin,
  Play,
  Puzzle,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export default function BlueprintPreviewPage({ dream, onPlay, onBack }) {
  const { t } = useTranslation();

  if (!dream?.blueprint) return null;

  const bp = dream.blueprint;
  const stages = Array.isArray(bp.stages) ? bp.stages : [];
  const assets = bp.assets || {};

  function getGenreLabel(genre) {
    const key = `genre_${(genre || "platformer").toLowerCase().replace(/[\s_]+/g, "_")}`;
    return t(key, { defaultValue: genre });
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/20 bg-white/5 transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center gap-2 w-max"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </button>
          <h2 className="text-3xl font-black text-white font-[var(--title-font)] uppercase flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[var(--accent-color)]" />
            {t("blueprintPreview")}
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            {dream.description}
          </p>
        </div>

        <button
          onClick={onPlay}
          className="bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] text-white px-8 py-4 rounded-xl text-sm font-bold tracking-wider hover:opacity-95 shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2 transition-all cursor-pointer font-[var(--title-font)] shrink-0"
        >
          <Play className="w-5 h-5 fill-white" />
          {t("launchGame")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[var(--accent-color)]" />
              {t("gameOverview")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-500 uppercase font-bold text-[10px]">
                  {t("dreamTitle")}
                </span>
                <p className="text-white font-bold mt-1">
                  {bp.title || dream.title}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-500 uppercase font-bold text-[10px]">
                  {t("genreLabel")}
                </span>
                <p className="text-[var(--accent-color)] font-bold mt-1">
                  {getGenreLabel(bp.genre)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-500 uppercase font-bold text-[10px]">
                  {t("hero")}
                </span>
                <p className="text-white font-bold mt-1">
                  {bp.hero || bp.player?.name || "Explorer"}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-500 uppercase font-bold text-[10px]">
                  {t("difficulty")}
                </span>
                <p className="text-yellow-400 font-bold mt-1 uppercase">
                  {bp.difficulty || "Medium"}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--secondary-color)]" />
              {t("stages")} ({stages.length || 1})
            </h3>
            <div className="flex flex-col gap-4">
              {(stages.length
                ? stages
                : [
                    {
                      environment: bp.world,
                      objective: bp.objective,
                      boss: { name: bp.boss },
                    },
                  ]
              ).map((stage, idx) => (
                <div
                  key={stage.stageNumber || idx}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-[var(--accent-color)] uppercase">
                      {t("stages")} {stage.stageNumber || idx + 1}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {stage.environment || bp.world}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 flex items-start gap-2">
                    <Target className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                    {stage.objective || bp.objective}
                  </p>
                  {stage.boss && (
                    <p className="text-xs text-red-300 flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5" />
                      {t("boss")}:{" "}
                      <span className="font-bold text-red-400">
                        {stage.boss.name || bp.boss}
                      </span>
                      {stage.boss.maxHp ? (
                        <span className="text-gray-500">
                          ({stage.boss.maxHp} HP)
                        </span>
                      ) : null}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-1 rounded bg-white/5 text-gray-400">
                      Blocks: {stage.blocks?.length || 0}
                    </span>
                    <span className="px-2 py-1 rounded bg-white/5 text-gray-400">
                      {t("enemies")}: {stage.enemies?.length || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t("world")} & {t("story")}
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[var(--secondary-color)] shrink-0" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px]">
                    {t("world")}
                  </span>
                  <p className="text-white font-semibold">
                    {bp.world || bp.theme}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Swords className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px]">
                    {t("enemies")}
                  </span>
                  <p className="text-white font-semibold">
                    {(bp.enemies || []).join(", ") || "Dream shadows"}
                  </p>
                </div>
              </div>
              {bp.genre === "puzzle" && (
                <div className="flex items-start gap-2">
                  <Puzzle className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-gray-500 uppercase font-bold text-[10px]">
                      {t("puzzleModeLabel")}
                    </span>
                    <p className="text-purple-200">{t("puzzleModeDesc")}</p>
                  </div>
                </div>
              )}
            </div>
            {bp.stories && (
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-300 leading-relaxed flex flex-col gap-2">
                <p>{bp.stories.intro}</p>
                <p className="text-white font-semibold border-l-2 border-[var(--accent-color)] pl-2">
                  {bp.stories.mission}
                </p>
              </div>
            )}
          </div>

          {Object.keys(assets).length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                {t("generatedAssets")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(assets).map(([key, url]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      {key}
                    </span>
                    <img
                      src={url}
                      alt={key}
                      className="w-full aspect-square object-cover rounded-lg border border-white/10 bg-black/40"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
