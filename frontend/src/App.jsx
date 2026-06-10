import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import GamePage from './pages/GamePage';
import DreamForm from './components/DreamForm';
import AudioSynth from './game/AudioSynth';

export default function App() {
  const [activePage, setActivePage] = useState('landing');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_details')) || null);
  const [token, setToken] = useState(localStorage.getItem('auth_token') || null);
  
  const [dreams, setDreams] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedDream, setSelectedDream] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize sound settings
  useEffect(() => {
    AudioSynth.setMute(isMuted);
  }, [isMuted]);

  // Sync token & user data to localStorage
  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user_details', JSON.stringify(newUser));
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDreams([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_details');
    AudioSynth.stopBGM();
    setActivePage('landing');
  };

  // Fetch Dreams and Leaderboard Scores
  const fetchDreams = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/dreams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDreams(data);
      }
    } catch (err) {
      console.error('Failed to fetch dreams:', err);
    }
  };

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/scores');
      if (res.ok) {
        const data = await res.json();
        setScores(data);
      }
    } catch (err) {
      console.error('Failed to fetch scores:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDreams();
      fetchScores();
      setActivePage('dashboard');
    } else {
      setActivePage('landing');
    }
  }, [token]);

  // Trigger synthesis of game
  const handleGenerateGame = async ({ title, description, openaiKey }) => {
    if (!token) return;
    setIsGenerating(true);
    
    // Minimum compilation animation duration (8.5 seconds) to present the terminal sequence
    const minAnimPromise = new Promise(resolve => setTimeout(resolve, 8500));
    
    try {
      const apiPromise = fetch('/api/dreams/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-openai-key': openaiKey || ''
        },
        body: JSON.stringify({ title, description })
      });

      // Wait for both the API call to resolve and the minimum compilation animation timer
      const [res] = await Promise.all([apiPromise, minAnimPromise]);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Generation failed');
      }

      setDreams(prev => [...prev, data]);
      setSelectedDream(data);
      setIsGenerating(false);
      setActivePage('game');

    } catch (err) {
      alert(err.message);
      setIsGenerating(false);
    }
  };

  // Fuse two dreams
  const handleFuseDreams = async (dreamId1, dreamId2) => {
    if (!token) return;
    try {
      const openaiKey = localStorage.getItem('user_openai_key') || '';
      const res = await fetch('/api/dreams/fuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-openai-key': openaiKey
        },
        body: JSON.stringify({ dreamId1, dreamId2 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Fusion failed');
      }

      setDreams(prev => [...prev, data]);
      setSelectedDream(data);
      setActivePage('game');
    } catch (err) {
      throw err;
    }
  };

  // Delete a dream
  const handleDeleteDream = async (id) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this dream game?')) return;
    try {
      const res = await fetch(`/api/dreams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setDreams(prev => prev.filter(d => d.id !== id));
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to delete dream:', err);
    }
  };

  // Submit high score
  const handleSaveScore = async (scorePayload) => {
    if (!token) return;
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scorePayload)
      });
      if (res.ok) {
        fetchScores(); // Refresh leaderboard
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Render current active page
  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage onLoginSuccess={handleLoginSuccess} />;
      case 'dashboard':
        return (
          <DashboardPage
            user={user}
            dreams={dreams}
            scores={scores}
            setActivePage={setActivePage}
            setSelectedDream={setSelectedDream}
          />
        );
      case 'generator':
        return <DreamForm onSubmit={handleGenerateGame} isGenerating={isGenerating} />;
      case 'history':
        return (
          <HistoryPage
            dreams={dreams}
            onDeleteDream={handleDeleteDream}
            onPlayDream={(dream) => {
              setSelectedDream(dream);
              setActivePage('game');
            }}
            onFuseDreams={handleFuseDreams}
          />
        );
      case 'profile':
        return <ProfilePage user={user} scores={scores} />;
      case 'game':
        return (
          <GamePage
            dream={selectedDream}
            onBack={() => {
              AudioSynth.stopBGM();
              setActivePage('dashboard');
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
        setActivePage={setActivePage}
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

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 bg-black/40 text-center text-[10px] text-gray-500 font-mono tracking-wider">
        DREAM2PLAY AI // INTERACTIVE COGNITIVE GAME GENERATION NODE // HACKATHON v1.0.0
      </footer>
    </div>
  );
}
