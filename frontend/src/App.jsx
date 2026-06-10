import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Memories from './pages/Memories.jsx';
import Preferences from './pages/Preferences.jsx';
import Events from './pages/Events.jsx';
import Wishlist from './pages/Wishlist.jsx';
import { API_BASE_URL } from './config.js';
import { Heart, CloudLightning } from 'lucide-react';
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
  const [coupleSettings, setCoupleSettings] = useState(null);
  
  // Navigation & UI States
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [serverOffline, setServerOffline] = useState(false);

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
      const [partnersRes, memoriesRes, preferencesRes, eventsRes, wishlistRes, coupleRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/partners`, { headers }),
        fetch(`${API_BASE_URL}/api/memories`, { headers }),
        fetch(`${API_BASE_URL}/api/preferences`, { headers }),
        fetch(`${API_BASE_URL}/api/events`, { headers }),
        fetch(`${API_BASE_URL}/api/wishlist`, { headers }),
        fetch(`${API_BASE_URL}/api/couple`, { headers }),
      ]);

      if (partnersRes.ok) setPartners(await partnersRes.json());
      if (memoriesRes.ok) setMemories(await memoriesRes.json());
      if (preferencesRes.ok) setPreferences(await preferencesRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (wishlistRes.ok) setWishlistItems(await wishlistRes.json());
      if (coupleRes.ok) setCoupleSettings(await coupleRes.json());

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
            setActivePage={setActivePage}
            coupleSettings={coupleSettings}
            setCoupleSettings={setCoupleSettings}
            token={token}
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
};
