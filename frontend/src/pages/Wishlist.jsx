import { useState, useRef } from 'react';
import { Plus, X, Camera, Gift, ExternalLink, CheckCircle, Trash2, Heart, AlertCircle, Edit } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'VND': return '₫';
    case 'MYR': return 'RM';
    case 'EUR':
    case 'EURO':
      return '€';
    case 'USD':
    default:
      return '$';
  }
};

const formatPrice = (price, currency) => {
  if (price === null || price === undefined) return '';
  const symbol = getCurrencySymbol(currency);
  
  if (currency === 'VND') {
    return `${Math.round(price).toLocaleString()}${symbol}`;
  } else if (currency === 'EUR' || currency === 'EURO') {
    return `${price.toFixed(2)}${symbol}`;
  } else if (currency === 'MYR') {
    return `${symbol}${price.toFixed(2)}`;
  } else {
    return `${symbol}${price.toFixed(2)}`;
  }
};

export default function Wishlist({ user, partners, wishlistItems, setWishlistItems, token }) {
  const [activeTab, setActiveTab] = useState('partner'); // 'partner' or 'mine'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'wished', 'purchased'
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [priority, setPriority] = useState(5);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeIndexes, setActiveIndexes] = useState({});
  const [selectedWishItemId, setSelectedWishItemId] = useState(null);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editPriority, setEditPriority] = useState(5);
  const [editUrl, setEditUrl] = useState('');

  const fileInputRef = useRef(null);
  const partner = partners.find(p => p.id !== user?.id);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSelectedImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextImage = (itemId, maxIndex) => {
    setActiveIndexes(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) + 1) % maxIndex
    }));
  };

  const handlePrevImage = (itemId, maxIndex) => {
    setActiveIndexes(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) - 1 + maxIndex) % maxIndex
    }));
  };

  const handleAddWish = async (e) => {
    e.preventDefault();
    if (!title) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('url', url);
      formData.append('currency', currency);
      formData.append('priority', priority);
      if (imageFiles.length > 0) {
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add wish');

      setWishlistItems(prev => [data, ...prev]);
      setTitle('');
      setDescription('');
      setPrice('');
      setUrl('');
      setCurrency('USD');
      setPriority(5);
      setImageFiles([]);
      setImagePreviews([]);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPurchased = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPurchased: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update item');

      setWishlistItems(prev => prev.map(item => item.id === id ? data : item));
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditing = (item) => {
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditPrice(item.price !== null && item.price !== undefined ? item.price.toString() : '');
    setEditCurrency(item.currency || 'USD');
    setEditPriority(item.priority || 5);
    setEditUrl(item.url || '');
    setIsEditing(true);
  };

  const handleUpdateWish = async (id) => {
    if (!editTitle) {
      alert('Title is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          price: editPrice ? parseFloat(editPrice) : null,
          currency: editCurrency,
          priority: editPriority,
          url: editUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update wish');

      setWishlistItems(prev => prev.map(item => item.id === id ? data : item));
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWish = async (id) => {
    if (!confirm('Are you sure you want to remove this item from your wishlist?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete');
      setWishlistItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setStatusFilter('all');
  };

  const getFilterBtnStyle = (status) => {
    const isActive = statusFilter === status;
    return {
      ...styles.filterBtn,
      ...(isActive ? {
        color: 'white',
        background: activeTab === 'partner' ? 'var(--secondary)' : 'var(--primary)',
        borderColor: activeTab === 'partner' ? 'var(--secondary)' : 'var(--primary)',
        boxShadow: activeTab === 'partner' ? '0 2px 8px rgba(176, 136, 255, 0.15)' : '0 2px 8px rgba(253, 114, 150, 0.15)',
      } : {})
    };
  };

  // Filter items
  const partnerWishes = wishlistItems.filter(item => item.ownerId === partner?.id);
  const myWishes = wishlistItems.filter(item => item.ownerId === user?.id);

  const displayedWishes = (activeTab === 'partner' ? partnerWishes : myWishes).filter(item => {
    if (statusFilter === 'wished') return !item.isPurchased;
    if (statusFilter === 'purchased') return item.isPurchased;
    return true; // 'all'
  });

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 className="title-serif" style={styles.title}>our wishlist & gifting hub</h2>
          <p style={styles.subtitle}>Add things you love, and surprise each other on birthdays or special milestones.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Add to My Wishlist
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => handleTabChange('partner')}
          style={{...styles.tabBtn, ...(activeTab === 'partner' ? styles.activeTabBtn : {}), borderColor: 'var(--secondary)'}}
        >
          <Gift size={18} />
          <span>{partner ? `${partner.name}'s Wishlist` : "Partner's Wishlist"}</span>
        </button>
        <button 
          onClick={() => handleTabChange('mine')}
          style={{...styles.tabBtn, ...(activeTab === 'mine' ? styles.activeTabBtn : {})}}
        >
          <Heart size={18} />
          <span>My Wishlist</span>
        </button>
      </div>

      {/* Status Filters */}
      <div style={styles.statusFiltersContainer}>
        <button 
          onClick={() => setStatusFilter('all')}
          style={getFilterBtnStyle('all')}
        >
          All
        </button>
        <button 
          onClick={() => setStatusFilter('wished')}
          style={getFilterBtnStyle('wished')}
        >
          Wished
        </button>
        <button 
          onClick={() => setStatusFilter('purchased')}
          style={getFilterBtnStyle('purchased')}
        >
          Purchased
        </button>
      </div>

      {/* Add Wish modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative', maxWidth: '520px' }}>
            <button onClick={() => setShowAddForm(false)} style={styles.closeBtn}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} fill="var(--primary)" color="var(--primary)" />
              Add Something to Your Wishlist
            </h3>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddWish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Drag & Drop Image Uploader */}
              <div 
                style={styles.uploadArea} 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  if (imagePreviews.length === 0) {
                    fileInputRef.current.click();
                  }
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                />
                {imagePreviews.length > 0 ? (
                  <div className="previews-wrapper" onClick={(e) => e.stopPropagation()}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="thumbnail-container">
                        <img src={preview} alt={`Selected ${index + 1}`} className="thumbnail-image" />
                        <button 
                          type="button" 
                          onClick={() => removeSelectedImage(index)} 
                          className="remove-thumbnail-btn"
                          title="Remove Photo"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <div className="add-more-thumbnail" onClick={() => fileInputRef.current.click()}>
                      <Plus size={18} />
                      <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Add More</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.uploadPrompt}>
                    <Camera size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Drag & drop photos here</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or click to browse (multiple allowed)</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Gift Item Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Mechanical Keyboard, Cute Lipstick" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Price & Currency (Optional)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-input" 
                    style={{ width: '110px', padding: '8px' }} 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VND">VND (₫)</option>
                    <option value="MYR">MYR (RM)</option>
                    <option value="EUR">EURO (€)</option>
                  </select>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={styles.priceSymbol}>{getCurrencySymbol(currency)}</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      style={{ paddingLeft: '28px' }}
                      placeholder="0.00" 
                      value={price} 
                      onChange={e => setPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Shopping Link URL (Optional)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://shopee.vn/... or Amazon link" 
                  value={url} 
                  onChange={e => setUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Love Level / Priority</label>
                <select 
                  className="form-input" 
                  value={priority} 
                  onChange={e => setPriority(parseInt(e.target.value))}
                >
                  <option value="10">10/10 - Absolutely obsessed! 😍</option>
                  <option value="9">9/10 - Really want this! 🔥</option>
                  <option value="8">8/10 - Would love to have! 💖</option>
                  <option value="7">7/10 - Want it a lot! 🥰</option>
                  <option value="6">6/10 - Nice to have! 🙂</option>
                  <option value="5">5/10 - Regular want! Choice</option>
                  <option value="4">4/10 - Cute minor wish! 🌱</option>
                  <option value="3">3/10 - If it's on sale! 🏷️</option>
                  <option value="2">2/10 - Low priority! ☁️</option>
                  <option value="1">1/10 - Just an idea! 💡</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes & Details</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '60px' }}
                  placeholder="Specify sizes, colors, details or why you want it..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Adding...' : 'Add to Wishlist'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Wishlist Grid */}
      {displayedWishes.length > 0 ? (
        <div className="wishlist-grid">
          {displayedWishes.map(item => {
            const imagesList = item.images && item.images.length > 0
              ? item.images.map(img => img.url)
              : (item.imageUrl ? [item.imageUrl] : []);

            const activeIndex = activeIndexes[item.id] || 0;
            const currentImgUrl = imagesList.length > 0 ? imagesList[activeIndex] : null;
            const itemUrl = currentImgUrl
              ? (currentImgUrl.startsWith('/uploads/') ? `${API_BASE_URL}${currentImgUrl}` : currentImgUrl)
              : null;
            
            return (
              <div 
                key={item.id} 
                className="glass-panel wish-card"
                onClick={() => {
                  setSelectedWishItemId(item.id);
                  setModalActiveIndex(0);
                }}
                style={{ cursor: 'pointer' }}
              >
                
                {/* Badge Status */}
                <span className={`wish-badge ${item.isPurchased ? 'purchased' : 'wished'}`}>
                  {item.isPurchased ? 'Purchased 🎁' : 'Wished ✨'}
                </span>

                {/* Priority / Love Level Badge */}
                <span className="wish-badge priority" style={{ right: 'auto', left: '12px', background: 'rgba(253, 114, 150, 0.18)', color: 'var(--primary)', border: '1px solid rgba(253, 114, 150, 0.3)' }}>
                  ❤️ {item.priority || 5}/10
                </span>

                {/* Polaroid Photo Frame */}
                <div className="wish-img-container">
                  {itemUrl ? (
                    <div className="carousel-container" style={{ width: '100%', height: '100%' }}>
                      <img src={itemUrl} alt={item.title} className="wish-img" />
                      
                      {imagesList.length > 1 && (
                        <>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage(item.id, imagesList.length);
                            }}
                            className="carousel-arrow left"
                            style={{ width: '28px', height: '28px', fontSize: '1.2rem', left: '8px' }}
                            title="Previous Photo"
                          >
                            &lsaquo;
                          </button>
                          
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage(item.id, imagesList.length);
                            }}
                            className="carousel-arrow right"
                            style={{ width: '28px', height: '28px', fontSize: '1.2rem', right: '8px' }}
                            title="Next Photo"
                          >
                            &rsaquo;
                          </button>

                          <div className="carousel-dots" style={{ bottom: '8px', padding: '4px 8px', gap: '4px' }}>
                            {imagesList.map((_, idx) => (
                              <div 
                                key={idx} 
                                className="carousel-dot"
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  background: idx === activeIndex ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveIndexes(prev => ({ ...prev, [item.id]: idx }));
                                }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="wish-fallback-img">
                      <Gift size={48} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="wish-details">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{item.title}</h3>
                  {item.price !== null && item.price !== undefined && (
                    <span className="wish-price">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  )}
                  {item.description && (
                    <p style={styles.wishDesc}>{item.description}</p>
                  )}

                  {/* Actions Area */}
                  <div className="wish-actions">
                    {/* Shopping URL */}
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-secondary"
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1, justifyContent: 'center' }}
                      >
                        <ExternalLink size={14} />
                        Buy Link
                      </a>
                    )}

                    {/* Fulfill actions */}
                    {activeTab === 'partner' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkPurchased(item.id, item.isPurchased);
                        }}
                        className={item.isPurchased ? 'btn-secondary' : 'btn-primary'}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1, justifyContent: 'center' }}
                      >
                        <CheckCircle size={14} />
                        {item.isPurchased ? 'Mark Unbought' : 'Mark Purchased'}
                      </button>
                    ) : (
                      !item.isPurchased && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWish(item.id);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--danger)', flex: item.url ? '0 0 auto' : 1, justifyContent: 'center' }}
                          title="Delete Wish"
                        >
                          <Trash2 size={14} />
                          {!item.url && 'Remove'}
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyWishes} onClick={() => { if (activeTab === 'mine') setShowAddForm(true); }}>
          <Gift size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3>No wishlist items here</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {activeTab === 'partner' 
              ? `${partner ? partner.name : "Your partner"} hasn't added any wishes yet.` 
              : "Click here to add something you've been wanting! 🎁"}
          </p>
        </div>
      )}

      {/* Wish Details Modal */}
      {selectedWishItemId && (() => {
        const item = wishlistItems.find(i => i.id === selectedWishItemId);
        if (!item) return null;
        
        const imagesList = item.images && item.images.length > 0
          ? item.images.map(img => img.url)
          : (item.imageUrl ? [item.imageUrl] : []);

        const currentImgUrl = imagesList.length > 0 ? imagesList[modalActiveIndex] : null;
        const itemUrl = currentImgUrl
          ? (currentImgUrl.startsWith('/uploads/') ? `${API_BASE_URL}${currentImgUrl}` : currentImgUrl)
          : null;

        const owner = (user && user.id === item.ownerId)
          ? user
          : (partners.find(p => p.id === item.ownerId) || item.owner);

        const buyer = item.boughtById
          ? (item.boughtById === user?.id ? user : (partners.find(p => p.id === item.boughtById) || item.boughtBy))
          : null;

        return (
          <div className="modal-overlay" onClick={() => { setSelectedWishItemId(null); setIsEditing(false); }}>
            <div 
              className="glass-panel modal-content" 
              style={{ 
                position: 'relative', 
                maxWidth: '600px', 
                width: '90%', 
                padding: '0', 
                borderRadius: '24px', 
                overflowY: 'auto',
                maxHeight: '90vh'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => { setSelectedWishItemId(null); setIsEditing(false); }} 
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  zIndex: 10,
                  backdropFilter: 'blur(4px)'
                }}
              >
                <X size={18} />
              </button>

              {/* Large Image Carousel */}
              <div style={{ position: 'relative', width: '100%', height: '350px', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {itemUrl ? (
                  <div className="carousel-container" style={{ width: '100%', height: '100%' }}>
                    <img 
                      src={itemUrl} 
                      alt={item.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.02)' }} 
                    />
                    
                    {imagesList.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={() => {
                            setModalActiveIndex(prev => (prev - 1 + imagesList.length) % imagesList.length);
                          }}
                          className="carousel-arrow left"
                          title="Previous Photo"
                        >
                          &lsaquo;
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            setModalActiveIndex(prev => (prev + 1) % imagesList.length);
                          }}
                          className="carousel-arrow right"
                          title="Next Photo"
                        >
                          &rsaquo;
                        </button>

                        <div className="carousel-dots">
                          {imagesList.map((_, idx) => (
                            <div 
                              key={idx} 
                              className="carousel-dot"
                              style={{
                                background: idx === modalActiveIndex ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)'
                              }}
                              onClick={() => setModalActiveIndex(idx)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', opacity: 0.3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Gift size={64} strokeWidth={1.2} />
                    <span style={{ fontSize: '0.9rem' }}>No reference picture</span>
                  </div>
                )}
              </div>

              {/* Wish Details Content */}
              {isEditing ? (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.25rem' }}>Edit Wish Details</h3>
                  
                  <div className="form-group">
                    <label>Gift Item Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Price & Currency (Optional)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        className="form-input" 
                        style={{ width: '110px', padding: '8px' }} 
                        value={editCurrency} 
                        onChange={e => setEditCurrency(e.target.value)}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="VND">VND (₫)</option>
                        <option value="MYR">MYR (RM)</option>
                        <option value="EUR">EURO (€)</option>
                      </select>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={styles.priceSymbol}>{getCurrencySymbol(editCurrency)}</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ paddingLeft: '28px' }}
                          placeholder="0.00" 
                          value={editPrice} 
                          onChange={e => setEditPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Shopping Link URL (Optional)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      value={editUrl} 
                      onChange={e => setEditUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Love Level / Priority</label>
                    <select 
                      className="form-input" 
                      value={editPriority} 
                      onChange={e => setEditPriority(parseInt(e.target.value))}
                    >
                      <option value="10">10/10 - Absolutely obsessed! 😍</option>
                      <option value="9">9/10 - Really want this! 🔥</option>
                      <option value="8">8/10 - Would love to have! 💖</option>
                      <option value="7">7/10 - Want it a lot! 🥰</option>
                      <option value="6">6/10 - Nice to have! 🙂</option>
                      <option value="5">5/10 - Regular want! Choice</option>
                      <option value="4">4/10 - Cute minor wish! 🌱</option>
                      <option value="3">3/10 - If it's on sale! 🏷️</option>
                      <option value="2">2/10 - Low priority! ☁️</option>
                      <option value="1">1/10 - Just an idea! 💡</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notes & Details</label>
                    <textarea 
                      className="form-input" 
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button 
                      onClick={() => handleUpdateWish(item.id)}
                      className="btn-primary"
                      style={{ padding: '12px', fontSize: '0.95rem', flex: 1, justifyContent: 'center' }}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary"
                      style={{ padding: '12px', fontSize: '0.95rem', flex: 1, justifyContent: 'center' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Header info (Title and Status Badges) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 className="title-serif" style={{ fontSize: '1.6rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Added for: <strong style={{ color: 'var(--primary)' }}>{owner?.name || 'Unknown'}</strong>
                      </p>
                    </div>
                    
                    <span className={`wish-badge ${item.isPurchased ? 'purchased' : 'wished'}`} style={{ position: 'static' }}>
                      {item.isPurchased ? 'Purchased 🎁' : 'Wished ✨'}
                    </span>
                  </div>

                  {/* Price */}
                  {item.price !== null && item.price !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
                        {formatPrice(item.price, item.currency)}
                      </span>
                    </div>
                  )}

                  {/* Priority / Love Meter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Love Meter: <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{item.priority || 5}/10</strong>
                    </span>
                    <div style={{ display: 'flex', gap: '2px', fontSize: '1.1rem' }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} style={{ opacity: i < (item.priority || 5) ? 1 : 0.2, filter: i < (item.priority || 5) ? 'none' : 'grayscale(100%)' }}>
                          ❤️
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Buyer / Fulfiller Info */}
                  {item.isPurchased && buyer && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      background: 'rgba(46, 204, 113, 0.1)', 
                      border: '1px solid rgba(46, 204, 113, 0.2)',
                      padding: '10px 16px', 
                      borderRadius: '12px' 
                    }}>
                      <img 
                        src={buyer.avatar ? (buyer.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${buyer.avatar}` : buyer.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                        alt={buyer.name} 
                        style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid var(--success)' }} 
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--success)' }}>
                        Fulfilled by {buyer.name}! Thank you 💖
                      </span>
                    </div>
                  )}

                  {/* Description / Notes (Un-clamped) */}
                  {item.description && (
                    <div style={{ 
                      borderTop: '1px solid var(--border-light)', 
                      borderBottom: '1px solid var(--border-light)', 
                      padding: '16px 0',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Notes & Details
                      </h4>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Actions Area */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-secondary"
                        style={{ padding: '12px', fontSize: '0.95rem', flex: 1, justifyContent: 'center' }}
                      >
                        <ExternalLink size={16} />
                        Buy Link / Shop Online
                      </a>
                    )}

                    {/* Fulfill actions (only if viewing partner's wishlist) */}
                    {item.ownerId !== user?.id ? (
                      <button 
                        onClick={() => {
                          handleMarkPurchased(item.id, item.isPurchased);
                        }}
                        className={item.isPurchased ? 'btn-secondary' : 'btn-primary'}
                        style={{ padding: '12px', fontSize: '0.95rem', flex: 1, justifyContent: 'center' }}
                      >
                        <CheckCircle size={16} />
                        {item.isPurchased ? 'Mark Unbought' : 'Mark Purchased'}
                      </button>
                    ) : (
                      // Delete and Edit buttons for user's own items
                      <>
                        {!item.isPurchased && (
                          <button 
                            onClick={() => startEditing(item)}
                            className="btn-primary"
                            style={{ padding: '12px', fontSize: '0.95rem', flex: 1, justifyContent: 'center' }}
                          >
                            <Edit size={16} />
                            Edit Details
                          </button>
                        )}
                        {!item.isPurchased && (
                          <button 
                            onClick={() => {
                              handleDeleteWish(item.id);
                              setSelectedWishItemId(null);
                            }}
                            className="btn-secondary"
                            style={{ padding: '12px', fontSize: '0.95rem', color: 'var(--danger)', flex: item.url ? '0 0 auto' : 1, justifyContent: 'center' }}
                            title="Delete Wish"
                          >
                            <Trash2 size={16} />
                            Delete Wish
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        );
      })()}
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
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  statusFiltersContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-card)',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    transition: 'var(--transition-smooth)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-card)',
    padding: '10px 20px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    transition: 'var(--transition-smooth)',
  },
  activeTabBtn: {
    color: 'white',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    border: 'none',
    boxShadow: '0 4px 15px rgba(253, 114, 150, 0.2)',
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
  uploadArea: {
    border: '2px dashed var(--border-card)',
    borderRadius: 'var(--border-radius-sm)',
    minHeight: '140px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(255,255,255,0.15)',
  },
  uploadPrompt: {
    textAlign: 'center',
    padding: '10px',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px',
    textAlign: 'center',
  },
  priceSymbol: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    fontWeight: '600',
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
  wishDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    margin: '10px 0',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyWishes: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 20px',
    borderRadius: '24px',
    background: 'var(--card-bg)',
    border: '1px dashed var(--border-card)',
  },
};
