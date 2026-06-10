import { useState, useRef } from 'react';
import { Plus, Trash2, Heart, Edit3, X } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

const CATEGORIES = ['General Info', 'Food & Drinks', 'Clothing & Sizes', 'Joy & Comfort'];

export default function Preferences({ user, setUser, partners, setPartners, preferences, setPreferences, token }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [item, setItem] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingPref, setEditingPref] = useState(null);
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editItem, setEditItem] = useState('');
  const [editValue, setEditValue] = useState('');

  const avatarInputRef = useRef(null);
  const partner = partners.find(p => p.id !== user?.id);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');

      setUser(data);
      setPartners(prev => prev.map(p => p.id === data.id ? data : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSaveName = async () => {
    if (!newName || !newName.trim() || newName.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');

      setUser(data);
      setPartners(prev => prev.map(p => p.id === data.id ? data : p));
      setIsEditingName(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  // Group preferences by userId and Category
  const getPrefs = (targetUserId, targetCategory) => {
    return preferences.filter(
      p => p.userId === targetUserId && p.category === targetCategory
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item || !value) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, item, value }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save preference');

      // Update state
      setPreferences(prev => {
        const idx = prev.findIndex(p => p.id === data.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [data, ...prev];
      });

      setItem('');
      setValue('');
      setShowAddForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this preference?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/preferences/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setPreferences(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartEditPref = (pref) => {
    setEditingPref(pref);
    setEditCategory(pref.category);
    setEditItem(pref.item);
    setEditValue(pref.value);
    setError('');
  };

  const handleEditPrefSubmit = async (e) => {
    e.preventDefault();
    if (!editItem || !editValue) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/preferences/${editingPref.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: editCategory, item: editItem, value: editValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update preference');

      setPreferences(prev => prev.map(p => p.id === data.id ? data : p));
      setEditingPref(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 className="title-serif" style={styles.title}>our tastes & details</h2>
          <p style={styles.subtitle}>Keep track of sizes, coffee orders, and notes on what makes each other happy.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Add Preference
        </button>
      </div>

      {/* Add Preference Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowAddForm(false)} 
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} fill="var(--primary)" color="var(--primary)" />
              Add Detail About Yourself
            </h3>
            
            {error && <p style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select 
                  className="form-select" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>What is it? (Item)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Favorite Coffee, Ring Size" 
                  value={item} 
                  onChange={e => setItem(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>The Answer (Value)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Iced Latte with oat milk, 6.5" 
                  value={value} 
                  onChange={e => setValue(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Detail'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Preference Modal */}
      {editingPref && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative' }}>
            <button 
              onClick={() => setEditingPref(null)} 
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} fill="var(--primary)" color="var(--primary)" />
              Edit Taste or Detail
            </h3>
            
            {error && <p style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}

            <form onSubmit={handleEditPrefSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select 
                  className="form-select" 
                  value={editCategory} 
                  onChange={e => setEditCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>What is it? (Item)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Favorite Coffee, Ring Size" 
                  value={editItem} 
                  onChange={e => setEditItem(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>The Answer (Value)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Iced Latte with oat milk, 6.5" 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Detail'}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Side by side columns */}
      <div className="pref-container">
        {/* User Column */}
        <div className="partner-card">
          <div className="partner-header">
            <div 
              className="avatar-container-hover"
              style={styles.avatarContainer} 
              onClick={() => avatarInputRef.current?.click()}
              title="Click to change profile picture"
            >
              <img 
                src={user?.avatar ? (user.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${user.avatar}` : user.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                alt={user?.name} 
                style={styles.clickableAvatar}
              />
              <div style={styles.avatarOverlay} className="avatar-hover-overlay">
                <span>Edit</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
            <div style={{ flex: 1 }}>
              {isEditingName ? (
                <input 
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  className="form-input"
                  style={{ fontSize: '1.2rem', padding: '4px 8px', maxWidth: '200px' }}
                  autoFocus
                />
              ) : (
                <h3 
                  style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  onClick={() => { setIsEditingName(true); setNewName(user?.name || ''); }}
                  title="Click to edit name"
                >
                  {user?.name}
                  <Edit3 size={14} style={{ opacity: 0.5 }} />
                </h3>
              )}
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>Your Profile</span>
            </div>
          </div>

          {CATEGORIES.map(cat => {
            const items = getPrefs(user?.id, cat);
            return (
              <div key={cat} className="pref-category-section">
                <h4 className="pref-category-title">{cat}</h4>
                {items.length > 0 ? (
                  items.map(pref => (
                    <div key={pref.id} className="pref-item-row">
                      <div>
                        <span className="pref-item-name">{pref.item}: </span>
                        <span className="pref-item-value">{pref.value}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleStartEditPref(pref)} 
                          className="edit-btn"
                          style={styles.editBtn}
                          title="Edit Detail"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(pref.id)} 
                          className="delete-btn"
                          style={styles.deleteBtn}
                          title="Delete Detail"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={styles.emptyText}>No details added yet in this category.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Partner Column */}
        <div className="partner-card" style={{ borderColor: 'rgba(176, 136, 255, 0.2)' }}>
          <div className="partner-header">
            <img 
              src={partner?.avatar ? (partner.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${partner.avatar}` : partner.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Partner'} 
              alt={partner?.name || 'Partner'} 
              className="partner-avatar" 
              style={{ borderColor: 'var(--secondary)' }}
            />
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>{partner?.name || 'Waiting for Girlfriend...'}</h3>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--secondary)', textTransform: 'uppercase' }}>Partner Profile</span>
            </div>
          </div>

          {partner ? (
            CATEGORIES.map(cat => {
              const items = getPrefs(partner.id, cat);
              return (
                <div key={cat} className="pref-category-section">
                  <h4 className="pref-category-title" style={{ color: 'var(--secondary)' }}>{cat}</h4>
                  {items.length > 0 ? (
                    items.map(pref => (
                      <div key={pref.id} className="pref-item-row">
                        <div>
                          <span className="pref-item-name">{pref.item}: </span>
                          <span className="pref-item-value">{pref.value}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={styles.emptyText}>No details added yet in this category.</p>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>Your partner hasn't logged in yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Once she logs in, her tastes and sizes will automatically appear here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '2.2rem',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
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
  editBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
    borderRadius: '4px',
    transition: 'color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
    borderRadius: '4px',
    transition: 'color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  avatarContainer: {
    position: 'relative',
    cursor: 'pointer',
    borderRadius: '50%',
    overflow: 'hidden',
    width: '70px',
    height: '70px',
  },
  clickableAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '3px solid var(--primary)',
    objectFit: 'cover',
    transition: 'all 0.3s ease',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    opacity: 0,
    transition: 'opacity 0.25s ease',
    borderRadius: '50%',
  },
};
// Add hover behavior for edit/delete buttons and avatar overlay
if (typeof window !== 'undefined') {
  const css = `
    .pref-item-row button.delete-btn:hover {
      color: var(--danger) !important;
    }
    .pref-item-row button.edit-btn:hover {
      color: var(--primary) !important;
    }
    .avatar-container-hover:hover .avatar-hover-overlay {
      opacity: 1 !important;
    }
  `;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
