import React from 'react';
import { Heart, BookOpen, UserCheck, Calendar, Gift, LogOut, Sun, Moon } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function Navbar({ activePage, setActivePage, user, partners, logout, theme, toggleTheme }) {
  // Find partner profile (the other user)
  const partner = partners.find(p => p.id !== user?.id);

  return (
    <nav className="glass-nav">
      <div className="nav-container">
        {/* Logo / App Name */}
        <div className="nav-logo" onClick={() => setActivePage('dashboard')}>
          <Heart size={24} fill="var(--primary)" color="var(--primary)" className="pulse-heart logo-heart-icon" />
          <span className="title-serif logo-text">our space</span>
        </div>

        {/* Center navigation links */}
        <div className="nav-links">
          <button 
            onClick={() => setActivePage('dashboard')} 
            className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
            title="Dashboard"
          >
            <Heart size={18} className="nav-link-icon" />
            <span className="nav-link-label">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActivePage('memories')} 
            className={`nav-link ${activePage === 'memories' ? 'active' : ''}`}
            title="Memories"
          >
            <BookOpen size={18} className="nav-link-icon" />
            <span className="nav-link-label">Memories</span>
          </button>
          
          <button 
            onClick={() => setActivePage('preferences')} 
            className={`nav-link ${activePage === 'preferences' ? 'active' : ''}`}
            title="Likes"
          >
            <UserCheck size={18} className="nav-link-icon" />
            <span className="nav-link-label">Likes</span>
          </button>
          
          <button 
            onClick={() => setActivePage('events')} 
            className={`nav-link ${activePage === 'events' ? 'active' : ''}`}
            title="Events"
          >
            <Calendar size={18} className="nav-link-icon" />
            <span className="nav-link-label">Events</span>
          </button>
          
          <button 
            onClick={() => setActivePage('wishlist')} 
            className={`nav-link ${activePage === 'wishlist' ? 'active' : ''}`}
            title="Wishlist"
          >
            <Gift size={18} className="nav-link-icon" />
            <span className="nav-link-label">Wishlist</span>
          </button>
        </div>

        {/* Right action group (avatars, theme, logout) */}
        <div className="nav-right-group">
          {/* Couple Avatars */}
          <div className="nav-avatars-wrapper">
            {user && (
              <img 
                src={user.avatar ? (user.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${user.avatar}` : user.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                alt={user.name} 
                className="nav-avatar-me" 
                title={`${user.name} (You)`}
              />
            )}
            <Heart size={10} fill="var(--primary)" color="var(--primary)" className="nav-avatar-heart" />
            {partner ? (
              <img 
                src={partner.avatar ? (partner.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${partner.avatar}` : partner.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Partner'} 
                alt={partner.name} 
                className="nav-avatar-partner" 
                title={partner.name}
              />
            ) : (
              <div className="nav-avatar-placeholder" title={partner?.name || 'Partner'}>{partner?.name ? partner.name[0].toLowerCase() : 'p'}</div>
            )}
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="nav-icon-button" title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} color="var(--warning)" /> : <Moon size={20} color="var(--text-muted)" />}
          </button>

          {/* Logout */}
          <button onClick={logout} className="nav-logout-btn" title="Log Out">
            <LogOut size={18} className="nav-logout-icon" />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
