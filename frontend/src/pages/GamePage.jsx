import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import GameCanvas from "../components/GameCanvas";

export default function GamePage({ dream, onBack, onSaveScore }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (dream?.blueprint?.mood) {
      const mood = dream.blueprint.mood.toLowerCase().replace("-", "");
      document.documentElement.setAttribute("data-theme", mood);
    }

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [dream]);

  if (!dream) return null;

  const mood = dream.blueprint?.mood || dream.blueprint?.theme || "Dream";

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="text-left">
        <h2 className="text-3xl font-black text-white font-[var(--title-font)] uppercase flex items-center gap-3">
          <span className="text-[var(--accent-color)] neon-text-glow">
            {mood} SIMULATOR
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono font-normal">
            G_ID: {dream.id}
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl font-medium">
          {t("dreamDescription")}: "{dream.description}"
        </p>
      </div>

      <GameCanvas dream={dream} onBack={onBack} onSaveScore={onSaveScore} />
    </div>
  );
}
