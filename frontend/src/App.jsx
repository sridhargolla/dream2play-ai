import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DreamForm from "./components/DreamForm";
import Navbar from "./components/Navbar";
import AudioSynth from "./game/AudioSynth";
import i18n from "./i18n";
import BlueprintPreviewPage from "./pages/BlueprintPreviewPage";
import DashboardPage from "./pages/DashboardPage";
import GamePage from "./pages/GamePage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import { getAIHeaders } from "./utils/aiSettings";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePage, setActivePage] = useState("landing");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user_details")) || null,
  );
  const [token, setToken] = useState(
    localStorage.getItem("auth_token") || null,
  );

  const [dreams, setDreams] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedDream, setSelectedDream] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [toast, setToast] = useState(null);

  // Initialize sound settings
  useEffect(() => {
    AudioSynth.setMute(isMuted);
  }, [isMuted]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activePage is deliberately omitted to prevent routing loop
  useEffect(() => {
    const pathPage = location.pathname.replace("/", "") || "landing";
    const allowed = [
      "landing",
      "dashboard",
      "generator",
      "preview",
      "history",
      "profile",
      "settings",
      "game",
    ];
    if (allowed.includes(pathPage) && pathPage !== activePage) {
      setActivePage(pathPage);
    }
  }, [location.pathname]);

  const goToPage = (page) => {
    setActivePage(page);
    navigate(page === "landing" ? "/" : `/${page}`);
  };

  // Sync token & user data to localStorage
  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("user_details", JSON.stringify(newUser));
    goToPage("dashboard");
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDreams([]);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_details");
    AudioSynth.stopBGM();
    goToPage("landing");
  };

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const openDreamPreview = (dream) => {
    setSelectedDream(dream);
    goToPage("preview");
  };
  const fetchDreams = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/dreams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDreams(data);
      }
    } catch (err) {
      console.error("Failed to fetch dreams:", err);
    }
  };

  const fetchScores = async () => {
    try {
      const res = await fetch("/api/scores");
      if (res.ok) {
        const data = await res.json();
        setScores(data);
      }
    } catch (err) {
      console.error("Failed to fetch scores:", err);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when token changes
  useEffect(() => {
    if (token) {
      fetchDreams();
      fetchScores();
      goToPage("dashboard");
    } else {
      goToPage("landing");
    }
  }, [token]);

  // Trigger synthesis of game
  const handleGenerateGame = async ({ title, description, openaiKey }) => {
    if (!token) return;
    setIsGenerating(true);

    // Minimum compilation animation duration
    const minAnimPromise = new Promise((resolve) => setTimeout(resolve, 3500));

    try {
      const apiPromise = fetch("/api/dreams/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-lang": i18n.language || "en",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ title, description }),
      });

      // Wait for both the API call to resolve and the minimum compilation animation timer
      const [res] = await Promise.all([apiPromise, minAnimPromise]);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Generation failed");
      }

      setDreams((prev) => [...prev, data]);
      setSelectedDream(data);
      setIsGenerating(false);
      goToPage("preview");
    } catch (err) {
      showToast(err.message);
      setIsGenerating(false);
    }
  };

  // Fuse two dreams
  const handleFuseDreams = async (dreamId1, dreamId2) => {
    if (!token) return;
    setIsFusing(true);
    try {
      const res = await fetch("/api/dreams/fuse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-lang": i18n.language || "en",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ dreamId1, dreamId2 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Fusion failed");
      }

      setDreams((prev) => [...prev, data]);
      setSelectedDream(data);
      goToPage("preview");
    } finally {
      setIsFusing(false);
    }
  };

  // Delete a dream
  const handleDeleteDream = async (id) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this dream game?")) return;
    try {
      const res = await fetch(`/api/dreams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDreams((prev) => prev.filter((d) => d.id !== id));
      } else {
        const data = await res.json();
        showToast(data.message);
      }
    } catch (err) {
      console.error("Failed to delete dream:", err);
    }
  };

  // Submit high score
  const handleSaveScore = async (scorePayload) => {
    if (!token) return;
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(scorePayload),
      });
      if (res.ok) {
        fetchScores();
      } else {
        const data = await res.json();
        showToast(data.message);
      }
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Render current active page
  const renderPage = () => {
    switch (activePage) {
      case "landing":
        return <LandingPage onLoginSuccess={handleLoginSuccess} />;
      case "dashboard":
        return (
          <DashboardPage
            user={user}
            dreams={dreams}
            scores={scores}
            setActivePage={goToPage}
            setSelectedDream={setSelectedDream}
            onOpenPreview={openDreamPreview}
          />
        );
      case "generator":
        return (
          <DreamForm
            onSubmit={handleGenerateGame}
            isGenerating={isGenerating}
          />
        );
      case "preview":
        return (
          <BlueprintPreviewPage
            dream={selectedDream}
            onPlay={() => goToPage("game")}
            onBack={() => goToPage("dashboard")}
          />
        );
      case "history":
        return (
          <HistoryPage
            dreams={dreams}
            onDeleteDream={handleDeleteDream}
            onPlayDream={openDreamPreview}
            onFuseDreams={handleFuseDreams}
            isFusing={isFusing}
          />
        );
      case "profile":
        return <ProfilePage user={user} scores={scores} />;
      case "settings":
        return <SettingsPage />;
      case "game":
        return (
          <GamePage
            dream={selectedDream}
            onBack={() => {
              AudioSynth.stopBGM();
              goToPage("preview");
            }}
            onSaveScore={handleSaveScore}
          />
        );
      default:
        return <LandingPage onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="min-height-screen flex flex-col bg-[#0a0b10] text-gray-100 overflow-x-hidden font-sans relative">
      {/* Background neon elements */}
      <div className="grid-bg" />
      <div className="radial-glow" />

      {/* Navigation Header */}
      <Navbar
        activePage={activePage}
        setActivePage={goToPage}
        user={user}
        onLogout={handleLogout}
        theme={selectedDream?.blueprint?.mood}
        toggleMute={toggleMute}
        isMuted={isMuted}
      />

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8">
        {renderPage()}
      </main>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
            toast.type === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-200"
              : "bg-green-500/15 border-green-500/30 text-green-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 bg-black/40 text-center text-[10px] text-gray-500 font-mono tracking-wider">
        DREAM2PLAY AI // INTERACTIVE COGNITIVE GAME GENERATION NODE // HACKATHON
        v1.0.0 //@ SRIDHAR GOLLA
      </footer>
    </div>
  );
}
