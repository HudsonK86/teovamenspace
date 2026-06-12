import { useState, useRef } from 'react';
import { Plus, X, Camera, Gift, ExternalLink, CheckCircle, Trash2, Heart, AlertCircle, Edit, ChevronUp, ChevronDown } from 'lucide-react';
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

const getPriorityLabel = (priority) => {
  switch (priority) {
    case 10: return 'Absolutely obsessed! 😍';
    case 9: return 'Really want this! 🔥';
    case 8: return 'Would love to have! 💖';
    case 7: return 'Want it a lot! 🥰';
    case 6: return 'Nice to have! 🙂';
    case 5: return 'Regular want! Choice';
    case 4: return 'Cute minor wish! 🌱';
    case 3: return 'If it\'s on sale! 🏷️';
    case 2: return 'Low priority! ☁️';
    case 1:
    default:
      return 'Just an idea! 💡';
  }
};

export default function Wishlist({ user, partners, wishlistItems, setWishlistItems, token, openLightbox }) {
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
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [editDraggedIdx, setEditDraggedIdx] = useState(null);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
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

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setEditImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSelectedEditImage = (index) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId) => {
    setEditExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleEditDragStartImage = (idx, isExisting) => {
    setEditDraggedIdx({ idx, isExisting });
  };

  const handleEditDragOverImage = (e) => {
    e.preventDefault();
  };

  const handleEditDropImage = (targetIdx, isTargetExisting) => {
    if (!editDraggedIdx) return;

    const { idx: draggedIdx, isExisting: isDraggedExisting } = editDraggedIdx;

    if (isDraggedExisting && isTargetExisting) {
      const newExisting = [...editExistingImages];
      const draggedImg = newExisting[draggedIdx];
      newExisting.splice(draggedIdx, 1);
      newExisting.splice(targetIdx, 0, draggedImg);
      setEditExistingImages(newExisting);
    } else if (!isDraggedExisting && !isTargetExisting) {
      const newPreviews = [...editImagePreviews];
      const newFiles = [...editImageFiles];
      const draggedPreview = newPreviews[draggedIdx];
      const draggedFile = newFiles[draggedIdx];
      newPreviews.splice(draggedIdx, 1);
      newFiles.splice(draggedIdx, 1);
      newPreviews.splice(targetIdx, 0, draggedPreview);
      newFiles.splice(targetIdx, 0, draggedFile);
      setEditImagePreviews(newPreviews);
      setEditImageFiles(newFiles);
    }

    setEditDraggedIdx(null);
  };

  const moveEditImageUp = (idx, isExisting) => {
    if (idx === 0) return;
    if (isExisting) {
      const newExisting = [...editExistingImages];
      [newExisting[idx - 1], newExisting[idx]] = [newExisting[idx], newExisting[idx - 1]];
      setEditExistingImages(newExisting);
    } else {
      const newPreviews = [...editImagePreviews];
      const newFiles = [...editImageFiles];
      [newPreviews[idx - 1], newPreviews[idx]] = [newPreviews[idx], newPreviews[idx - 1]];
      [newFiles[idx - 1], newFiles[idx]] = [newFiles[idx], newFiles[idx - 1]];
      setEditImagePreviews(newPreviews);
      setEditImageFiles(newFiles);
    }
  };

  const moveEditImageDown = (idx, isExisting) => {
    const list = isExisting ? editExistingImages : editImagePreviews;
    if (idx === list.length - 1) return;
    if (isExisting) {
      const newExisting = [...editExistingImages];
      [newExisting[idx], newExisting[idx + 1]] = [newExisting[idx + 1], newExisting[idx]];
      setEditExistingImages(newExisting);
    } else {
      const newPreviews = [...editImagePreviews];
      const newFiles = [...editImageFiles];
      [newPreviews[idx], newPreviews[idx + 1]] = [newPreviews[idx + 1], newPreviews[idx]];
      [newFiles[idx], newFiles[idx + 1]] = [newFiles[idx + 1], newFiles[idx]];
      setEditImagePreviews(newPreviews);
      setEditImageFiles(newFiles);
    }
  };

  const startEditing = (item) => {
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditPrice(item.price !== null && item.price !== undefined ? item.price.toString() : '');
    setEditCurrency(item.currency || 'USD');
    setEditPriority(item.priority || 5);
    setEditUrl(item.url || '');
    setEditExistingImages(item.images || []);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setIsEditing(true);
  };

  const handleUpdateWish = async (id) => {
    if (!editTitle) {
      alert('Title is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      formData.append('price', editPrice);
      formData.append('currency', editCurrency);
      formData.append('priority', editPriority);
      formData.append('url', editUrl);
      formData.append('existingImageIds', JSON.stringify(editExistingImages.map(img => img.id)));
      if (editImageFiles.length > 0) {
        editImageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update wish');

      setWishlistItems(prev => prev.map(item => item.id === id ? data : item));
      setIsEditing(false);
      setSelectedWishItemId(null);
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
                style={{
                  ...styles.uploadArea,
                  height: imagePreviews.length > 0 ? 'auto' : '140px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  alignItems: imagePreviews.length > 0 ? 'flex-start' : 'center'
                }} 
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
            
            const buyer = item.boughtById
              ? (item.boughtById === user?.id ? user : (partners.find(p => p.id === item.boughtById) || item.boughtBy))
              : null;

            return (
              <div 
                key={item.id} 
                className="glass-panel wish-card"
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
                <div 
                  className="wish-img-container"
                  style={{ cursor: 'pointer' }}
                  onClick={() => itemUrl && openLightbox(imagesList, activeIndex)}
                >
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{item.title}</h3>
                    {/* Inline edit/remove buttons for owner's item */}
                    {activeTab === 'mine' && !item.isPurchased && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(item);
                            setSelectedWishItemId(item.id);
                          }}
                          className="memory-action-btn edit-btn"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                          title="Edit Wish"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWish(item.id);
                          }}
                          className="memory-action-btn delete-btn"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                          title="Delete Wish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {item.price !== null && item.price !== undefined && (
                    <span className="wish-price">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  )}
                  
                  {/* Love Level (Hearts & Description Label) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0 8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Love Level:
                      </span>
                      <div style={{ display: 'flex', gap: '2px', fontSize: '0.85rem' }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} style={{ opacity: i < (item.priority || 5) ? 1 : 0.15 }}>
                            ❤️
                          </span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                      {item.priority || 5}/10 - {getPriorityLabel(item.priority || 5)}
                    </span>
                  </div>

                  {item.description && (
                    <p style={styles.wishDesc}>{item.description}</p>
                  )}

                  {/* Buyer / Fulfiller Info */}
                  {item.isPurchased && buyer && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      background: 'rgba(46, 204, 113, 0.08)', 
                      border: '1px solid rgba(46, 204, 113, 0.15)',
                      padding: '8px 12px', 
                      borderRadius: '10px',
                      marginTop: '8px',
                      marginBottom: '8px'
                    }}>
                      <img 
                        src={buyer.avatar ? (buyer.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${buyer.avatar}` : buyer.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                        alt={buyer.name} 
                        style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--success)' }} 
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--success)' }}>
                        Fulfilled by {buyer.name}! 💝
                      </span>
                    </div>
                  )}

                  {/* Actions Area */}
                  {((activeTab === 'partner') || (activeTab === 'mine' && item.url)) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '15px' }}>
                      {/* Shopping URL */}
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-secondary"
                          onClick={(e) => e.stopPropagation()}
                          style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}
                        >
                          <ExternalLink size={14} />
                          Buy Link
                        </a>
                      )}

                      {/* Partner actions */}
                      {activeTab === 'partner' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkPurchased(item.id, item.isPurchased);
                          }}
                          className={item.isPurchased ? 'btn-secondary' : 'btn-primary'}
                          style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
                        >
                          <CheckCircle size={14} />
                          {item.isPurchased ? 'Mark Unbought' : 'Mark Purchased'}
                        </button>
                      )}
                    </div>
                  )}
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

      {/* Wish Edit Modal (standalone) */}
      {selectedWishItemId && isEditing && (() => {
        const item = wishlistItems.find(i => i.id === selectedWishItemId);
        if (!item) return null;
        
        return (
          <div className="modal-overlay" onClick={() => { setSelectedWishItemId(null); setIsEditing(false); }}>
            <div 
              className="glass-panel modal-content" 
              style={{ 
                position: 'relative', 
                maxWidth: '520px', 
                width: '90%', 
                padding: '24px', 
                borderRadius: '24px', 
                overflowY: 'auto',
                maxHeight: '90vh'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { setSelectedWishItemId(null); setIsEditing(false); }} style={styles.closeBtn}>
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={20} fill="var(--primary)" color="var(--primary)" />
                Edit Wishlist Item
              </h3>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateWish(item.id); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Drag & Drop Image Uploader for Editing */}
                <div 
                  style={{
                    ...styles.uploadArea,
                    height: (editExistingImages.length > 0 || editImagePreviews.length > 0) ? 'auto' : '140px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    alignItems: (editExistingImages.length > 0 || editImagePreviews.length > 0) ? 'flex-start' : 'center'
                  }} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                    if (files.length > 0) {
                      setEditImageFiles(prev => [...prev, ...files]);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditImagePreviews(prev => [...prev, reader.result]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  onClick={() => {
                    if (editExistingImages.length === 0 && editImagePreviews.length === 0) {
                      editFileInputRef.current.click();
                    }
                  }}
                >
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleEditImageChange}
                    accept="image/*"
                    multiple
                  />
                  {editExistingImages.length > 0 || editImagePreviews.length > 0 ? (
                    <div className="previews-wrapper" onClick={(e) => e.stopPropagation()}>
                      {/* Existing database images */}
                      {editExistingImages.map((img, idx) => {
                        const fullUrl = img.url.startsWith('/uploads/') ? `${API_BASE_URL}${img.url}` : img.url;
                        return (
                          <div 
                            key={img.id} 
                            className="thumbnail-container"
                            draggable
                            onDragStart={() => handleEditDragStartImage(idx, true)}
                            onDragOver={handleEditDragOverImage}
                            onDrop={() => handleEditDropImage(idx, true)}
                            style={{ opacity: editDraggedIdx?.isExisting && editDraggedIdx?.idx === idx ? 0.5 : 1, position: 'relative' }}
                          >
                            <img src={fullUrl} alt="Existing" className="thumbnail-image" />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(img.id)}
                              className="remove-thumbnail-btn"
                              title="Remove Photo"
                            >
                              <X size={10} />
                            </button>
                            <div style={styles.mobileArrowButtons}>
                              <button
                                type="button"
                                onClick={() => moveEditImageUp(idx, true)}
                                disabled={idx === 0}
                                style={{ ...styles.arrowBtn, opacity: idx === 0 ? 0.3 : 1 }}
                                title="Move up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveEditImageDown(idx, true)}
                                disabled={idx === editExistingImages.length - 1}
                                style={{ ...styles.arrowBtn, opacity: idx === editExistingImages.length - 1 ? 0.3 : 1 }}
                                title="Move down"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Newly selected image previews */}
                      {editImagePreviews.map((preview, index) => (
                        <div 
                          key={index} 
                          className="thumbnail-container"
                          draggable
                          onDragStart={() => handleEditDragStartImage(index, false)}
                          onDragOver={handleEditDragOverImage}
                          onDrop={() => handleEditDropImage(index, false)}
                          style={{ opacity: !editDraggedIdx?.isExisting && editDraggedIdx?.idx === index ? 0.5 : 1, position: 'relative' }}
                        >
                          <img src={preview} alt={`Selected ${index + 1}`} className="thumbnail-image" />
                          <button
                            type="button"
                            onClick={() => removeSelectedEditImage(index)}
                            className="remove-thumbnail-btn"
                            title="Remove Photo"
                          >
                            <X size={10} />
                          </button>
                          <div style={styles.mobileArrowButtons}>
                            <button
                              type="button"
                              onClick={() => moveEditImageUp(index, false)}
                              disabled={index === 0}
                              style={{ ...styles.arrowBtn, opacity: index === 0 ? 0.3 : 1 }}
                              title="Move up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditImageDown(index, false)}
                              disabled={index === editImagePreviews.length - 1}
                              style={{ ...styles.arrowBtn, opacity: index === editImagePreviews.length - 1 ? 0.3 : 1 }}
                              title="Move down"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="add-more-thumbnail" onClick={() => editFileInputRef.current.click()}>
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

                <div style={{ display: 'flex', marginTop: '8px' }}>
                  <button 
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '12px', fontSize: '0.95rem', width: '100%', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
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
    lineHeight: '1.5',
    margin: '12px 0',
    whiteSpace: 'pre-wrap',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border-card)',
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
  mobileArrowButtons: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '4px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  arrowBtn: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--primary)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'opacity 0.2s',
  },
};

if (typeof window !== 'undefined') {
  const css = `
    .thumbnail-container:hover .mobileArrowButtons {
      opacity: 1 !important;
    }
    .mobileArrowButtons button:disabled {
      cursor: not-allowed !important;
    }
    @media (max-width: 820px) {
      .mobileArrowButtons {
        opacity: 1 !important;
      }
    }
  `;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
