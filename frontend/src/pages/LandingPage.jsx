import {
  AlertCircle,
  Gamepad2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function LandingPage({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("authError"));
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12 px-4">
      <div className="lg:col-span-7 flex flex-col gap-6 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-glow)] border border-[var(--accent-color)]/30 text-[var(--accent-color)] w-max animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          {t("hackathon")}
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white font-[var(--title-font)]">
          {t("heroTitle")}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-color)] to-[var(--secondary-color)] neon-text-glow">
            {t("tagline")}
          </span>
        </h1>

        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl font-medium">
          {t("heroCopy")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="glass-panel p-4 rounded-xl flex items-start gap-3 border border-white/5 bg-white/5">
            <div className="p-2 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-[var(--title-font)]">
                {t("gameBlueprint")}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {t("objective")} + {t("enemies")} + {t("boss")}
              </p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl flex items-start gap-3 border border-white/5 bg-white/5">
            <div className="p-2 rounded-lg bg-[var(--secondary-color)]/10 text-[var(--secondary-color)]">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-[var(--title-font)]">
                {t("dreamStoryline")}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {t("gameStarted")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 w-full">
        <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden bg-[#12131a]/85 border border-white/10">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-color)] to-transparent" />

          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-black text-white font-[var(--title-font)]">
              {isLogin ? t("login") : t("createAccount")}
            </h3>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-[var(--accent-color)] font-bold hover:underline"
            >
              {isLogin ? t("signUpInstead") : t("signInInstead")}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("username")}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("username")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-color)] transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t("email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-color)] transition-all font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-color)] transition-all font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-color)] hover:opacity-95 text-white py-3 rounded-xl font-bold text-xs tracking-wider shadow-lg shadow-[var(--accent-glow)] transition-all disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                t("loading")
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {isLogin ? t("enterTerminal") : t("initializeAccount")}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
