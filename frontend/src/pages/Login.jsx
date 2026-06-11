import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function Login({ onLoginSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Google Credential Response
  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');

      localStorage.setItem('token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render official Google Sign-in button on mount
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
        });
        
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: isMobile ? 'medium' : 'large', width: isMobile ? 280 : 396 }
          );
        }
      }
    };

    // Retry initialization in case script loads slightly after component mount
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.heartContainer} className="pulse-heart">
            <Heart size={48} fill="var(--primary)" color="var(--primary)" />
            <Sparkles size={24} color="var(--secondary)" style={styles.sparkles} />
          </div>
          <h1 className="title-serif" style={styles.title}>our private world</h1>
          <p style={styles.subtitle}>A private shared diary, events dashboard, and gift registry for the two of us.</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="var(--danger)" />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        <div style={styles.actions}>
          {/* Main Google Sign-In Container (Google renders button here) */}
          <div style={styles.googleContainer}>
            <div id="google-signin-btn"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    background: 'var(--bg-gradient)',
  },
  card: {
    maxWidth: '460px',
    width: '100%',
    padding: '40px 32px',
    textAlign: 'center',
    borderRadius: 'var(--border-radius-lg)',
  },
  header: {
    marginBottom: '32px',
  },
  heartContainer: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '20px',
  },
  sparkles: {
    position: 'absolute',
    top: '-8px',
    right: '-12px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '0.98rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  errorBox: {
    background: 'rgba(255, 77, 77, 0.12)',
    border: '1px solid rgba(255, 77, 77, 0.25)',
    color: 'var(--text-main)',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '24px',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  googleContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    minWidth: '240px',
  },
};
