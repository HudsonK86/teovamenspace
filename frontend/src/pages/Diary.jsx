import React, { useState, useRef } from 'react';
import { Notebook, Plus, X, Search, Calendar, Edit3, Trash2, Heart, AlignLeft, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

// Helpers for Vietnam Timezone (UTC+7)
const getVietnameseTimeString = () => {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('sv-SE', options);
  return formatter.format(now).replace(' ', 'T');
};

const parseVNInputToUTC = (inputStr) => {
  if (!inputStr) return new Date().toISOString();
  const [datePart, timePart] = inputStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const utcTime = Date.UTC(year, month - 1, day, hours, minutes);
  return new Date(utcTime - 7 * 60 * 60 * 1000).toISOString();
};

const formatToVNInputString = (dateInput) => {
  if (!dateInput) return '';
  const dateObj = new Date(dateInput);
  const options = {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('sv-SE', options);
  return formatter.format(dateObj).replace(' ', 'T');
};

export default function Diary({ user, partners = [], diaries, setDiaries, token }) {
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all'); // 'all', 'me', 'partner'
  
  // Form States (Add)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(getVietnameseTimeString());
  
  // Form States (Edit)
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const partner = partners.find(p => p.id !== user?.id);

  // Handlers
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content || !date) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/diary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, date: parseVNInputToUTC(date) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create diary entry');

      setDiaries(prev => [data, ...prev]);
      setShowAddModal(false);
      
      // Reset form
      setTitle('');
      setContent('');
      setDate(getVietnameseTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    
    // Format date safely to Vietnam Time Input format
    setEditDate(formatToVNInputString(entry.date));
    setError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle || !editContent || !editDate) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/diary/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle, content: editContent, date: parseVNInputToUTC(editDate) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update entry');

      setDiaries(prev => prev.map(d => d.id === editingEntry.id ? data : d));
      setEditingEntry(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this diary entry?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/diary/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete entry');
      }

      setDiaries(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtering Logic
  const filteredDiaries = diaries.filter(entry => {
    // 1. Search Query filter (title or content)
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Author filter
    if (authorFilter === 'me') {
      return matchesSearch && entry.authorId === user.id;
    } else if (authorFilter === 'partner') {
      return matchesSearch && entry.authorId !== user.id;
    }
    return matchesSearch;
  });

  return (
    <div className="page-container fade-in">
      {/* Header Widget */}
      <div className="glass-panel page-header-widget" style={styles.headerWidget}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="widget-icon-wrapper" style={{ background: 'var(--primary-light)' }}>
            <Notebook size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 className="title-serif" style={{ margin: 0 }}>Shared Diary</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Write logs, text memories, and thoughts to capture our journey
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-panel filter-panel" style={styles.filterPanel}>
        <div className="search-container" style={styles.searchContainer}>
          <Search size={18} color="var(--text-muted)" style={{ marginLeft: '12px' }} />
          <input 
            type="text" 
            placeholder="Search diary entries..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div className="filter-tabs" style={styles.filterTabs}>
          <button 
            onClick={() => setAuthorFilter('all')} 
            className={`filter-tab ${authorFilter === 'all' ? 'active' : ''}`}
            style={authorFilter === 'all' ? styles.activeFilterTab : styles.filterTab}
          >
            All Entries ({diaries.length})
          </button>
          <button 
            onClick={() => setAuthorFilter('me')} 
            className={`filter-tab ${authorFilter === 'me' ? 'active' : ''}`}
            style={authorFilter === 'me' ? styles.activeFilterTab : styles.filterTab}
          >
            My Logs
          </button>
          {partner && (
            <button 
              onClick={() => setAuthorFilter('partner')} 
              className={`filter-tab ${authorFilter === 'partner' ? 'active' : ''}`}
              style={authorFilter === 'partner' ? styles.activeFilterTab : styles.filterTab}
            >
              {partner.name}'s Logs
            </button>
          )}
        </div>
      </div>

      {/* Facebook-style Composer Box */}
      <div 
        className="glass-panel facebook-composer" 
        onClick={() => { setError(''); setShowAddModal(true); }}
      >
        <img 
          src={user?.avatar ? (user.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${user.avatar}` : user.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
          alt={user?.name || 'User'}
          style={styles.composerAvatar}
        />
        <div className="composer-placeholder-inner">
          What's on ur mind, {user?.name ? user.name.split(' ')[0] : 'dear'}?...
        </div>
      </div>

      {/* Diary Timeline */}
      {filteredDiaries.length > 0 ? (
        <div className="timeline" style={{ marginTop: '20px' }}>
          {filteredDiaries.map(entry => {
            const author = (user && user.id === entry.authorId)
              ? user
              : (partners.find(p => p.id === entry.authorId) || entry.author);

            return (
              <div key={entry.id} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-date">
                  {new Date(entry.date).toLocaleString(undefined, { 
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
                
                <div className="glass-panel diary-card" style={styles.diaryCard}>
                  <div style={styles.diaryHeader}>
                    <div>
                      <h3 style={styles.diaryTitle}>{entry.title}</h3>
                      <div style={styles.diaryMeta}>
                        {author && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img 
                              src={author.avatar ? (author.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${author.avatar}` : author.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                              alt={author.name}
                              style={styles.authorAvatar}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{author.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="diary-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleStartEdit(entry)} 
                        className="memory-action-btn edit-btn"
                        style={styles.actionBtn}
                        title="Edit Entry"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)} 
                        className="memory-action-btn delete-btn"
                        style={styles.actionBtn}
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={styles.diaryBody}>
                    <p style={styles.diaryText}>{entry.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel empty-state" style={styles.emptyState}>
          <Notebook size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>No Diary Entries Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
            {searchQuery ? 'Try clearing your search query or filters.' : 'Write down your first thoughts or moments today!'}
          </p>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative', maxWidth: '550px' }}>
            <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Notebook size={20} color="var(--primary)" />
              Write Diary Entry
            </h3>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Today we did something special..." 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Date & Time (Vietnam Time)</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Content / Thoughts</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '180px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }}
                  placeholder="Pour your heart out here..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Posting Log...' : 'Save Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative', maxWidth: '550px' }}>
            <button onClick={() => setEditingEntry(null)} style={styles.closeBtn}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Notebook size={20} color="var(--primary)" />
              Edit Diary Entry
            </h3>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Date & Time (Vietnam Time)</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={editDate} 
                  onChange={e => setEditDate(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Content / Thoughts</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '180px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }}
                  value={editContent} 
                  onChange={e => setEditContent(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  headerWidget: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  filterPanel: {
    padding: '16px 20px',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-search-input, rgba(255, 255, 255, 0.45))',
    border: '1px solid var(--border-card)',
    borderRadius: '20px',
    width: '300px',
    maxWidth: '100%',
    backdropFilter: 'blur(8px)',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    padding: '10px 12px',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
    color: 'var(--text-main)',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  filterTab: {
    background: 'rgba(255, 255, 255, 0.25)',
    border: '1px solid var(--border-card)',
    borderRadius: '16px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeFilterTab: {
    background: 'var(--primary)',
    color: 'white',
    border: '1px solid var(--primary)',
    borderRadius: '16px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-primary)',
    transition: 'all 0.2s',
  },
  diaryCard: {
    padding: '24px',
    transition: 'all 0.25s ease',
  },
  diaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    borderBottom: '1px dashed var(--border-card)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  diaryTitle: {
    fontSize: '1.25rem',
    margin: 0,
    color: 'var(--text-main)',
    fontWeight: '700',
  },
  diaryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '6px',
  },
  authorAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1.5px solid var(--primary-light)',
  },
  actionBtn: {
    background: 'rgba(255,255,255,0.35)',
    border: '1px solid var(--border-card)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  diaryBody: {
    position: 'relative',
  },
  diaryText: {
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    lineHeight: '1.65',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  emptyState: {
    padding: '48px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginTop: '20px',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  errorBox: {
    background: 'rgba(255, 77, 77, 0.12)',
    border: '1px solid rgba(255, 77, 77, 0.25)',
    color: 'var(--text-main)',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  composerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--primary-light)',
  },
};
