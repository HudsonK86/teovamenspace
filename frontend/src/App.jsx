import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Memories from './pages/Memories.jsx';
import Preferences from './pages/Preferences.jsx';
import Events from './pages/Events.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Diary from './pages/Diary.jsx';
import { API_BASE_URL } from './config.js';
import { Heart, CloudLightning, X } from 'lucide-react';
import './App.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [partners, setPartners] = useState([]);
  
  // Data State
  const [memories, setMemories] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [events, setEvents] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [coupleSettings, setCoupleSettings] = useState(null);
  
  // Navigation & UI States
  const [activePage, setActivePage] = useState('dashboard');
  const [wishlistActiveTab, setWishlistActiveTab] = useState('partner');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [serverOffline, setServerOffline] = useState(false);

  // Lightbox State
  const [lightboxImages, setLightboxImages] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const openLightbox = (images, index = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxImages) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev + 1) % lightboxImages.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'Escape') {
        setLightboxImages(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImages]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const minSwipeDistance = 50;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > minSwipeDistance) {
      setLightboxIndex(prev => (prev + 1) % lightboxImages.length);
    } else if (diff < -minSwipeDistance) {
      setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    }
  };

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Fetch all shared data once user is authenticated
  const fetchAllData = async (authToken) => {
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };

      // Check server health first
      const healthCheck = await fetch(`${API_BASE_URL}/health`).catch(() => null);
      if (!healthCheck) {
        setServerOffline(true);
        setLoading(false);
        return;
      }
      setServerOffline(false);

      // Load User Me
      const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers });
      if (!meRes.ok) {
        if (meRes.status === 401) {
          logout();
        }
        throw new Error('Unauthorized');
      }
      const meData = await meRes.json();
      setUser(meData);

      // Parallel data fetching
      const [partnersRes, memoriesRes, preferencesRes, eventsRes, wishlistRes, coupleRes, diaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/partners`, { headers }),
        fetch(`${API_BASE_URL}/api/memories`, { headers }),
        fetch(`${API_BASE_URL}/api/preferences`, { headers }),
        fetch(`${API_BASE_URL}/api/events`, { headers }),
        fetch(`${API_BASE_URL}/api/wishlist`, { headers }),
        fetch(`${API_BASE_URL}/api/couple`, { headers }),
        fetch(`${API_BASE_URL}/api/diary`, { headers }),
      ]);

      if (partnersRes.ok) setPartners(await partnersRes.json());
      if (memoriesRes.ok) setMemories(await memoriesRes.json());
      if (preferencesRes.ok) setPreferences(await preferencesRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (wishlistRes.ok) setWishlistItems(await wishlistRes.json());
      if (coupleRes.ok) setCoupleSettings(await coupleRes.json());
      if (diaryRes.ok) setDiaries(await diaryRes.json());

    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // On mount, load profile if token exists
  useEffect(() => {
    if (token) {
      fetchAllData(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setToken(userToken);
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setPartners([]);
    setMemories([]);
    setPreferences([]);
    setEvents([]);
    setWishlistItems([]);
    setDiaries([]);
    setCoupleSettings(null);
    setActivePage('dashboard');
  };

  // Render Loading State
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Heart size={48} fill="var(--primary)" color="var(--primary)" className="pulse-heart" />
        <span style={{ marginTop: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>Entering Our Space...</span>
      </div>
    );
  }

  // Render Server Offline Banner (Highly useful debug warning)
  if (serverOffline) {
    return (
      <div style={styles.offlineContainer}>
        <div className="glass-panel" style={styles.offlineCard}>
          <CloudLightning size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px' }}>Backend Server Offline</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
            We couldn't connect to the backend server at <code>{API_BASE_URL}</code>.
            Please verify that:
          </p>
          <ul style={styles.offlineList}>
            <li>Your PostgreSQL server is running.</li>
            <li>You have run migrations on the backend (<code>npm run prisma:migrate</code>).</li>
            <li>The Node backend application is running (<code>npm run dev</code> inside <code>/backend</code>).</li>
          </ul>
          <button 
            className="btn-primary" 
            onClick={() => fetchAllData(token)} 
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Page Routing Switcher
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            partners={partners} 
            memories={memories} 
            events={events} 
            wishlistItems={wishlistItems} 
            diaries={diaries}
            setActivePage={setActivePage}
            setWishlistActiveTab={setWishlistActiveTab}
            coupleSettings={coupleSettings}
            setCoupleSettings={setCoupleSettings}
            token={token}
            openLightbox={openLightbox}
          />
        );
      case 'memories':
        return (
          <Memories 
            user={user} 
            partners={partners}
            memories={memories} 
            setMemories={setMemories} 
            token={token} 
            openLightbox={openLightbox}
          />
        );
      case 'preferences':
        return (
          <Preferences 
            user={user} 
            setUser={setUser}
            partners={partners} 
            setPartners={setPartners}
            preferences={preferences} 
            setPreferences={setPreferences} 
            token={token} 
          />
        );
      case 'events':
        return (
          <Events 
            user={user} 
            partners={partners} 
            events={events} 
            setEvents={setEvents} 
            token={token} 
          />
        );
      case 'wishlist':
        return (
          <Wishlist 
            user={user} 
            partners={partners} 
            wishlistItems={wishlistItems} 
            setWishlistItems={setWishlistItems} 
            token={token} 
            openLightbox={openLightbox}
            activeTab={wishlistActiveTab}
            setActiveTab={setWishlistActiveTab}
          />
        );
      case 'diary':
        return (
          <Diary 
            user={user} 
            partners={partners} 
            diaries={diaries} 
            setDiaries={setDiaries} 
            token={token} 
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="app-container">
      <Navbar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        user={user} 
        partners={partners} 
        logout={logout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="main-content">
        {renderActivePage()}
      </main>

      {/* Full screen Lightbox Viewer */}
      {lightboxImages && (
        <div 
          className="lightbox-overlay"
          onClick={() => setLightboxImages(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={styles.lightboxOverlay}
        >
          <button 
            style={styles.lightboxClose}
            onClick={(e) => { e.stopPropagation(); setLightboxImages(null); }}
            title="Close Viewer (Esc)"
          >
            <X size={24} color="white" />
          </button>
          
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxImages[lightboxIndex].startsWith('/uploads/') ? `${API_BASE_URL}${lightboxImages[lightboxIndex]}` : lightboxImages[lightboxIndex]}
              alt=""
              style={styles.lightboxImage}
            />
          </div>

          {lightboxImages.length > 1 && (
            <>
              <button 
                style={{ ...styles.lightboxNav, left: '20px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                }}
                title="Previous Image"
              >
                &lsaquo;
              </button>
              <button 
                style={{ ...styles.lightboxNav, right: '20px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => (prev + 1) % lightboxImages.length);
                }}
                title="Next Image"
              >
                &rsaquo;
              </button>
              <div style={styles.lightboxCounter}>
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-gradient)',
  },
  offlineContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    background: 'var(--bg-gradient)',
  },
  offlineCard: {
    maxWidth: '460px',
    width: '100%',
    padding: '32px',
    textAlign: 'center',
    borderRadius: '24px',
  },
  offlineList: {
    textAlign: 'left',
    fontSize: '0.9rem',
    marginBottom: '24px',
    paddingLeft: '20px',
    lineHeight: '1.6',
    color: 'var(--text-main)',
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.93)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    userSelect: 'none',
  },
  lightboxClose: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 100000,
    transition: 'background 0.2s',
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '85vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    fontSize: '2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    lineHeight: '0',
    zIndex: 100000,
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.95rem',
    fontWeight: '700',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '6px 16px',
    borderRadius: '20px',
    backdropFilter: 'blur(4px)',
  },
};
