import React from 'react';
import { Heart, BookOpen, UserCheck, Calendar, Gift, LogOut, Sun, Moon } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function Navbar({ activePage, setActivePage, user, partners, logout, theme, toggleTheme }) {
  // Find partner profile (the other user)
  const partner = partners.find(p => p.id !== user?.id);

  return (
    <nav className="glass-nav" style={styles.nav}>
      <div style={styles.navContainer}>
        {/* Logo / App Name */}
        <div style={styles.logo} onClick={() => setActivePage('dashboard')}>
          <Heart size={24} fill="var(--primary)" color="var(--primary)" className="pulse-heart" />
          <span className="title-serif" style={styles.logoText}>our space</span>
        </div>

        {/* Center navigation links */}
        <div style={styles.navLinks}>
          <button 
            onClick={() => setActivePage('dashboard')} 
            style={{...styles.navLink, ...(activePage === 'dashboard' ? styles.activeNavLink : {})}}
          >
            <Heart size={18} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActivePage('memories')} 
            style={{...styles.navLink, ...(activePage === 'memories' ? styles.activeNavLink : {})}}
          >
            <BookOpen size={18} />
            <span>Memories</span>
          </button>
          
          <button 
            onClick={() => setActivePage('preferences')} 
            style={{...styles.navLink, ...(activePage === 'preferences' ? styles.activeNavLink : {})}}
          >
            <UserCheck size={18} />
            <span>Likes</span>
          </button>
          
          <button 
            onClick={() => setActivePage('events')} 
            style={{...styles.navLink, ...(activePage === 'events' ? styles.activeNavLink : {})}}
          >
            <Calendar size={18} />
            <span>Events</span>
          </button>
          
          <button 
            onClick={() => setActivePage('wishlist')} 
            style={{...styles.navLink, ...(activePage === 'wishlist' ? styles.activeNavLink : {})}}
          >
            <Gift size={18} />
            <span>Wishlist</span>
          </button>
        </div>

        {/* Right action group (avatars, theme, logout) */}
        <div style={styles.rightGroup}>
          {/* Couple Avatars */}
          <div style={styles.avatarsWrapper}>
            {user && (
              <img 
                src={user.avatar ? (user.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${user.avatar}` : user.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                alt={user.name} 
                style={styles.avatarMe} 
                title={`${user.name} (You)`}
              />
            )}
            <Heart size={10} fill="var(--primary)" color="var(--primary)" style={styles.avatarHeart} />
            {partner ? (
              <img 
                src={partner.avatar ? (partner.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${partner.avatar}` : partner.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Partner'} 
                alt={partner.name} 
                style={styles.avatarPartner} 
                title={partner.name}
              />
            ) : (
              <div style={styles.avatarPlaceholder} title="Waiting for partner...">?</div>
            )}
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} style={styles.iconButton} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} color="var(--warning)" /> : <Moon size={20} color="var(--text-muted)" />}
          </button>

          {/* Logout */}
          <button onClick={logout} style={styles.logoutBtn} title="Log Out">
            <LogOut size={18} />
            <span style={styles.logoutText}>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'var(--card-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--border-light)',
    padding: '12px 24px',
    boxShadow: 'var(--card-shadow)',
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  activeNavLink: {
    color: 'var(--primary)',
    background: 'var(--primary-light)',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatarsWrapper: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    marginRight: '8px',
  },
  avatarMe: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid var(--primary)',
    zIndex: 2,
    objectFit: 'cover',
  },
  avatarPartner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid var(--secondary)',
    marginLeft: '-8px',
    zIndex: 1,
    objectFit: 'cover',
  },
  avatarHeart: {
    position: 'absolute',
    bottom: '-2px',
    left: '13px',
    zIndex: 3,
    background: 'var(--card-bg)',
    borderRadius: '50%',
    padding: '1px',
    width: '14px',
    height: '14px',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px dashed var(--text-muted)',
    background: 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginLeft: '-8px',
    zIndex: 1,
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--danger)',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
  logoutText: {
    display: 'inline',
  },
};

// Handle responsiveness simple hack
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 650px)');
  const handleTabletChange = (e) => {
    if (e.matches) {
      styles.logoutText = { display: 'none' };
      styles.navLink = { ...styles.navLink, padding: '8px', fontSize: '0' }; // Icons only
    } else {
      styles.logoutText = { display: 'inline' };
      styles.navLink = { ...styles.navLink, padding: '10px 16px', fontSize: '0.95rem' };
    }
  };
  mediaQuery.addListener(handleTabletChange);
  handleTabletChange(mediaQuery);
}
