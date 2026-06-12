import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, BookOpen, Gift, Calendar, CheckSquare, MessageCircleHeart, Plus, Trash2, Edit3, Save, X, ChevronUp, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

const ROMANTIC_QUOTES = [
  "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine. — Maya Angelou",
  "We loved with a love that was more than love. — Edgar Allan Poe",
  "If I know what love is, it is because of you. — Hermann Hesse",
  "You are my today and all of my tomorrows. — Leo Christopher",
  "In case you ever foolishly forget: I am never not thinking of you. — Virginia Woolf",
  "Home is wherever I'm with you. 🏡",
  "You are my favorite notification. 💖",
  "Every love story is beautiful, but ours is my favorite. ✨",
  "Whatever our souls are made of, his and mine are the same. — Emily Brontë",
  "You make me want to be a better man. — Melvin Udall",
  "I love you not only for what you are, but for what I am when I am with you. — Roy Croft",
  "Grow old along with me! The best is yet to be. — Robert Browning",
  "Loved you yesterday, love you still, always have, always will. 💕",
  "I swear I couldn't love you more than I do right now, and yet I know I will tomorrow. — Leo Christopher",
  "To lose balance sometimes for love is part of living a balanced life. — Elizabeth Gilbert",
  "We are most alive when we're in love. — John Updike",
  "The best thing to hold onto in life is each other. — Audrey Hepburn",
  "You have bewitched me, body and soul, and I love, I love, I love you. — Pride and Prejudice",
  "My love for you is a journey; starting at forever, and ending at never. ♾️",
  "If I had a flower for every time I thought of you... I could walk through my garden forever. — Alfred Tennyson"
];

export default function Dashboard({ user, partners, memories, events, wishlistItems, setActivePage, coupleSettings, setCoupleSettings, token, openLightbox }) {
  const [randomQuote, setRandomQuote] = useState('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [nextEvent, setNextEvent] = useState(null);

  // Couple settings slider and date editor states
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState('');
  const [isEditingPhotos, setIsEditingPhotos] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const partner = partners.find(p => p.id !== user?.id);

  const photos = coupleSettings?.pictures || [];

  const anniversaryDate = coupleSettings?.startDate ? new Date(coupleSettings.startDate) : null;
  let daysTogether = 0;
  if (anniversaryDate && !isNaN(anniversaryDate.getTime())) {
    const now = new Date();
    // Use UTC components to avoid local timezone shifting bugs
    const start = new Date(Date.UTC(anniversaryDate.getUTCFullYear(), anniversaryDate.getUTCMonth(), anniversaryDate.getUTCDate()));
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const diffTime = today - start;
    daysTogether = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    try {
      const res = await fetch(`${API_BASE_URL}/api/couple/pictures`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo(s)');
      setCoupleSettings(data);
      setActivePhotoIdx(data.pictures.length - 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditPhotos = () => {
    setEditPhotos(photos);
    setNewFiles([]);
    setNewPreviews([]);
    setIsEditingPhotos(true);
  };

  const handleEditPhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewPreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSelectedEditPhoto = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingEditPhoto = (photoUrl) => {
    setEditPhotos(prev => prev.filter(pic => pic !== photoUrl));
  };

  const moveEditPhotoUp = (idx) => {
    if (idx === 0) return;
    const newPhotos = [...editPhotos];
    [newPhotos[idx - 1], newPhotos[idx]] = [newPhotos[idx], newPhotos[idx - 1]];
    setEditPhotos(newPhotos);
  };

  const moveEditPhotoDown = (idx) => {
    if (idx === editPhotos.length - 1) return;
    const newPhotos = [...editPhotos];
    [newPhotos[idx], newPhotos[idx + 1]] = [newPhotos[idx + 1], newPhotos[idx]];
    setEditPhotos(newPhotos);
  };

  const handleSavePhotos = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPictures = [...editPhotos];

      // 1. If there are new files, upload them first
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach(file => {
          formData.append('images', file);
        });

        const uploadRes = await fetch(`${API_BASE_URL}/api/couple/pictures`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload new photos');
        
        const newUrls = uploadData.pictures.slice(uploadData.pictures.length - newFiles.length);
        finalPictures = [...finalPictures, ...newUrls];
      }

      // 2. Persist the final list to the server
      const updateRes = await fetch(`${API_BASE_URL}/api/couple/pictures`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pictures: finalPictures })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to save photos layout');

      setCoupleSettings(updateData);
      setActivePhotoIdx(0);
      setIsEditingPhotos(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (idx) => {
    setDraggedPhotoIdx(idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx) => {
    if (draggedPhotoIdx === null || draggedPhotoIdx === targetIdx) {
      setDraggedPhotoIdx(null);
      return;
    }

    const newPhotos = [...editPhotos];
    const draggedPhoto = newPhotos[draggedPhotoIdx];
    newPhotos.splice(draggedPhotoIdx, 1);
    newPhotos.splice(targetIdx, 0, draggedPhoto);

    setEditPhotos(newPhotos);
    setDraggedPhotoIdx(null);
  };

  const handleSaveDate = async () => {
    if (!editDateValue) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/couple`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ startDate: editDateValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update date');
      setCoupleSettings(data);
      setIsEditingDate(false);
    } catch (err) {
      alert(err.message);
    }
  };

  // Set random quote once
  useEffect(() => {
    const idx = Math.floor(Math.random() * ROMANTIC_QUOTES.length);
    setRandomQuote(ROMANTIC_QUOTES[idx]);
  }, []);

  // Find next upcoming event and calculate countdown
  useEffect(() => {
    if (!events || events.length === 0) return;

    const now = new Date();
    const upcoming = events
      .filter(e => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcoming.length > 0) {
      const targetEvent = upcoming[0];
      setNextEvent(targetEvent);

      const updateTimer = () => {
        const diffMs = new Date(targetEvent.date) - new Date();
        if (diffMs <= 0) {
          setCountdown({ days: 0, hours: 0, minutes: 0 });
          return;
        }

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setCountdown({ days, hours, minutes });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // update every minute
      return () => clearInterval(interval);
    } else {
      setNextEvent(null);
    }
  }, [events]);

  // Statistics calculation
  const totalMemories = memories.length;
  const partnerWishes = wishlistItems.filter(item => item.ownerId === partner?.id && !item.isPurchased).length;
  const myWishes = wishlistItems.filter(item => item.ownerId === user?.id).length;
  
  // Calculate uncompleted tasks assigned to me
  const uncompletedTasks = events.reduce((acc, event) => {
    const myTasks = event.checklist.filter(item => item.assignedTo === user?.id && !item.isCompleted);
    return acc + myTasks.length;
  }, 0);

  // Get 3 recent memories with pictures
  const recentMemories = memories
    .filter(m => m.imageUrl)
    .slice(0, 3);

  return (
    <div style={styles.container}>
      {/* Welcome Banner - Spans Full Width */}
      <div className="glass-panel welcome-widget" style={styles.welcomeWidgetFull}>
        <div style={styles.welcomeTextContainer}>
          <div style={styles.greetingRow}>
            <h2 className="title-serif" style={styles.greeting}>hello, lovely couple</h2>
            <Sparkles size={18} color="var(--primary)" />
          </div>
          <p style={styles.welcomeSubtitle}>
            {partner 
              ? `${user?.name} & ${partner?.name} have been building this space together.` 
              : 'Welcome to your private memory space. Invite your partner to start sharing!'}
          </p>
        </div>

        {/* Quote on the right side of the Welcome Banner */}
        <div className="welcome-quote-divider" style={styles.welcomeQuoteContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '4px' }}>
            <MessageCircleHeart size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Love Note</span>
          </div>
          <p className="title-serif" style={styles.welcomeQuoteText}>"{randomQuote}"</p>
        </div>

        <Heart size={80} fill="rgba(253, 114, 150, 0.1)" color="rgba(253, 114, 150, 0.15)" style={styles.hugeHeart} />
      </div>

      <div className="dashboard-grid">
        {/* Left side: Main feed */}
        <div style={styles.leftCol}>
          {/* Couple Photo Frame Widget */}
          <div className="glass-panel" style={styles.photoFrameCard}>
            <div style={styles.loveStoryHeader}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <Heart size={20} fill="var(--primary)" color="var(--primary)" className="pulse-heart" />
                Our Moments
              </h3>
              <button
                onClick={handleOpenEditPhotos}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Edit photos"
              >
                <Edit3 size={16} />
                Edit
              </button>
            </div>

            {/* Photo Slider */}
            <div style={styles.sliderFrameTall} className="slider-frame-hover">
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                multiple
              />
              {photos.length > 0 ? (
                <>
                  <img 
                    src={photos[activePhotoIdx].startsWith('/uploads/') ? `${API_BASE_URL}${photos[activePhotoIdx]}` : photos[activePhotoIdx]} 
                    alt="" 
                    style={styles.sliderBgBlur}
                  />
                  <div 
                    style={{ ...styles.sliderImgContainer, cursor: 'pointer' }}
                    onClick={() => openLightbox(photos, activePhotoIdx)}
                  >
                    <img 
                      src={photos[activePhotoIdx].startsWith('/uploads/') ? `${API_BASE_URL}${photos[activePhotoIdx]}` : photos[activePhotoIdx]} 
                      alt="Our love memory" 
                      style={styles.sliderImg}
                    />
                  </div>
                  
                  {photos.length > 1 && (
                    <>
                      <button 
                        style={{ ...styles.sliderNavBtn, left: '16px' }} 
                        onClick={() => setActivePhotoIdx(prev => (prev - 1 + photos.length) % photos.length)}
                      >
                        &lsaquo;
                      </button>
                      <button 
                        style={{ ...styles.sliderNavBtn, right: '16px' }} 
                        onClick={() => setActivePhotoIdx(prev => (prev + 1) % photos.length)}
                      >
                        &rsaquo;
                      </button>
                      <div style={styles.sliderCounter}>
                        {activePhotoIdx + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={styles.sliderPlaceholder} className="slider-placeholder-hover" onClick={() => fileInputRef.current?.click()}>
                  <img src="/couple_placeholder.png" alt="Love illustration" style={styles.placeholderImg} />
                  <div style={styles.placeholderOverlay} className="placeholder-overlay-hover">
                    <Plus size={24} style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Upload Couple Photo</span>
                  </div>
                </div>
              )}
            </div>

            {anniversaryDate && (
              <div className="combined-footer-responsive" style={styles.combinedStoryFooter}>
                <div className="story-details-side" style={styles.storyDetailsSide}>
                  <h4 className="partner-names" style={styles.partnerNames}>
                    {partner ? `${partner.name} & ${user?.name}` : `${user?.name}`}
                  </h4>
                  
                  {isEditingDate ? (
                    <div className="date-editor-inline" style={styles.dateEditorInline}>
                      <input 
                        type="date" 
                        className="form-input date-input-inline" 
                        style={styles.dateInputInline}
                        value={editDateValue} 
                        onChange={e => setEditDateValue(e.target.value)} 
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-primary editor-btn-inline" style={styles.editorBtnInline} onClick={handleSaveDate}>
                          <Save size={12} />
                        </button>
                        <button className="btn-secondary editor-btn-inline" style={styles.editorBtnInline} onClick={() => setIsEditingDate(false)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="anniversary-row-inline" style={styles.anniversaryRowInline}>
                      <span>
                        Since {anniversaryDate.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </span>
                      <button 
                        style={styles.editDateBtnInline}
                        className="edit-date-btn-hover edit-date-btn-inline"
                        onClick={() => {
                          setEditDateValue(coupleSettings?.startDate ? coupleSettings.startDate.split('T')[0] : '');
                          setIsEditingDate(true);
                        }}
                        title="Edit Start Date"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="story-counter-side" style={styles.storyCounterSide}>
                  <span className="days-num-combined" style={styles.daysNumCombined}>{daysTogether}</span>
                  <span className="days-label-combined" style={styles.daysLabelCombined}>Days Together</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Memories Teaser */}
          <div className="glass-panel" style={styles.recentMemoriesWidget}>
            <div style={styles.sectionHeader}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="var(--primary)" />
                Recent Memories
              </h3>
              <button onClick={() => setActivePage('memories')} style={styles.seeAllBtn}>View Journal</button>
            </div>
            
            {recentMemories.length > 0 ? (
              <div style={styles.memoriesTeaserGrid}>
                {recentMemories.map(memory => (
                  <div 
                    key={memory.id} 
                    style={styles.teaserCard}
                    onClick={() => setActivePage('memories')}
                  >
                    <img 
                      src={memory.imageUrl.startsWith('/uploads/') ? `${API_BASE_URL}${memory.imageUrl}` : memory.imageUrl} 
                      alt={memory.title} 
                      style={styles.teaserImg}
                    />
                    <div style={styles.teaserOverlay}>
                      <span style={styles.teaserDate}>{new Date(memory.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span style={styles.teaserTitle}>{memory.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyTeaser} onClick={() => setActivePage('memories')}>
                <p>No photos posted yet. Tap here to capture your first memory together! 📸</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Widgets and Quick Stats */}
        <div style={styles.rightCol}>


          {/* Next Milestone Countdown */}
          {nextEvent ? (
            <div className="glass-panel" style={styles.countdownWidget}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Calendar size={20} color="var(--primary)" />
                <span style={styles.countdownHeader}>Upcoming Event Countdown</span>
              </div>
              <h3 style={styles.countdownTitle}>{nextEvent.title}</h3>
              <p style={styles.eventDetails}>
                {new Date(nextEvent.date).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              
              <div className="countdown-container">
                <div className="countdown-card">
                  <span className="countdown-number">{countdown.days}</span>
                  <span className="countdown-label">Days</span>
                </div>
                <div className="countdown-card">
                  <span className="countdown-number">{countdown.hours}</span>
                  <span className="countdown-label">Hours</span>
                </div>
                <div className="countdown-card">
                  <span className="countdown-number">{countdown.minutes}</span>
                  <span className="countdown-label">Mins</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ ...styles.countdownWidget, textAlign: 'center', padding: '32px' }} onClick={() => setActivePage('events')}>
              <Calendar size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '8px' }}>No upcoming events</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}>
                Click here to schedule a date, anniversary, or trip!
              </p>
            </div>
          )}



          {/* Quick Stats Grid */}
          <div style={styles.statsContainer}>
            {/* Stat 1: Memories */}
            <div className="glass-panel" style={styles.statBox} onClick={() => setActivePage('memories')}>
              <BookOpen size={24} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <span style={styles.statVal}>{totalMemories}</span>
              <span style={styles.statLabel}>Journal Pages</span>
            </div>

            {/* Stat 2: Wishlist */}
            <div className="glass-panel" style={styles.statBox} onClick={() => setActivePage('wishlist')}>
              <Gift size={24} color="var(--secondary)" style={{ marginBottom: '8px' }} />
              <span style={styles.statVal}>{partnerWishes}</span>
              <span style={styles.statLabel}>Surprises to Buy</span>
            </div>

            {/* Stat 3: Tasks */}
            <div className="glass-panel" style={styles.statBox} onClick={() => setActivePage('events')}>
              <CheckSquare size={24} color="var(--success)" style={{ marginBottom: '8px' }} />
              <span style={styles.statVal}>{uncompletedTasks}</span>
              <span style={styles.statLabel}>Tasks for You</span>
            </div>

            {/* Stat 4: Wishlist items owned by user */}
            <div className="glass-panel" style={styles.statBox} onClick={() => setActivePage('wishlist')}>
              <Heart size={24} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <span style={styles.statVal}>{myWishes}</span>
              <span style={styles.statLabel}>Your Wishes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Our Moments Modal */}
      {isEditingPhotos && (
        <div className="modal-overlay">
          <div 
            className="glass-panel modal-content" 
            style={{ 
              position: 'relative', 
              maxWidth: '550px',
              width: '95%',
              padding: '24px',
              borderRadius: '24px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <button
              onClick={() => setIsEditingPhotos(false)}
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} fill="var(--primary)" color="var(--primary)" />
              Edit Our Moments
            </h3>

            {photos.length > 0 || newPreviews.length > 0 ? (
              <form onSubmit={handleSavePhotos} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                  type="file" 
                  ref={editFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleEditPhotoChange} 
                  accept="image/*" 
                  multiple
                />
                
                {/* Photo Thumbnails Grid */}
                <div style={styles.uploadArea}>
                  <div className="previews-wrapper" onClick={(e) => e.stopPropagation()}>
                    {/* Existing database images */}
                    {editPhotos.map((photoUrl, idx) => {
                      const fullUrl = photoUrl.startsWith('/uploads/') ? `${API_BASE_URL}${photoUrl}` : photoUrl;
                      return (
                        <div
                          key={idx}
                          className="thumbnail-container"
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(idx)}
                          style={{ opacity: draggedPhotoIdx === idx ? 0.5 : 1, position: 'relative' }}
                        >
                          <img src={fullUrl} alt={`Photo ${idx + 1}`} className="thumbnail-image" />
                          <button
                            type="button"
                            onClick={() => removeExistingEditPhoto(photoUrl)}
                            className="remove-thumbnail-btn"
                            title="Remove Photo"
                          >
                            <X size={10} />
                          </button>
                          <div style={styles.mobileArrowButtons}>
                            <button
                              type="button"
                              onClick={() => moveEditPhotoUp(idx)}
                              disabled={idx === 0}
                              style={{ ...styles.arrowBtn, opacity: idx === 0 ? 0.3 : 1 }}
                              title="Move up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditPhotoDown(idx)}
                              disabled={idx === editPhotos.length - 1}
                              style={{ ...styles.arrowBtn, opacity: idx === editPhotos.length - 1 ? 0.3 : 1 }}
                              title="Move down"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Newly selected image previews */}
                    {newPreviews.map((preview, idx) => (
                      <div key={idx} className="thumbnail-container" style={{ position: 'relative' }}>
                        <img src={preview} alt={`Selected ${idx + 1}`} className="thumbnail-image" />
                        <button
                          type="button"
                          onClick={() => removeSelectedEditPhoto(idx)}
                          className="remove-thumbnail-btn"
                          title="Remove Photo"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}

                    <div className="add-more-thumbnail" onClick={() => editFileInputRef.current?.click()}>
                      <Plus size={18} />
                      <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Add More</span>
                    </div>
                  </div>
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
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <p>No couple photos yet. Upload your first photo to get started!</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => editFileInputRef.current?.click()}
                  style={{ marginTop: '16px' }}
                >
                  <Plus size={16} />
                  Upload Photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcomeWidget: {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '140px',
  },
  welcomeWidgetFull: {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '140px',
    background: 'linear-gradient(135deg, rgba(253, 114, 150, 0.15) 0%, rgba(176, 136, 255, 0.15) 100%)',
    border: '1px solid var(--border-card)',
    position: 'relative',
    overflow: 'hidden',
    flexWrap: 'wrap',
    gap: '32px',
  },
  welcomeTextContainer: {
    zIndex: 2,
    flex: '1 1 300px',
  },
  welcomeQuoteContainer: {
    flex: '1 1 300px',
    maxWidth: '450px',
    borderLeft: '1.5px solid rgba(253, 114, 150, 0.25)',
    paddingLeft: '24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    zIndex: 2,
  },
  welcomeQuoteText: {
    fontSize: '0.95rem',
    fontStyle: 'italic',
    color: 'var(--text-main)',
    lineHeight: '1.45',
  },
  greetingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  greeting: {
    fontSize: '1.8rem',
    color: 'var(--primary)',
    fontWeight: '700',
  },
  welcomeSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  hugeHeart: {
    position: 'absolute',
    right: '20px',
    bottom: '-10px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  countdownWidget: {
    display: 'flex',
    flexDirection: 'column',
  },
  countdownHeader: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  countdownTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    marginTop: '4px',
  },
  eventDetails: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  recentMemoriesWidget: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  memoriesTeaserGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  teaserCard: {
    height: '140px',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    border: '1px solid var(--border-light)',
    transition: 'transform 0.25s ease',
  },
  teaserImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  teaserOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    color: 'white',
  },
  teaserDate: {
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  teaserTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyTeaser: {
    height: '120px',
    border: '2.5px dashed var(--border-light)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  quoteCard: {
    background: 'linear-gradient(135deg, rgba(176, 136, 255, 0.08) 0%, rgba(253, 114, 150, 0.08) 100%)',
    border: '1px solid var(--border-card)',
  },
  quoteText: {
    fontSize: '1.1rem',
    fontStyle: 'italic',
    color: 'var(--text-main)',
    lineHeight: '1.5',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px 12px',
    cursor: 'pointer',
  },
  statVal: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
  statLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  loveStoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoFrameCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sliderFrameTall: {
    width: '100%',
    height: '380px',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid var(--border-light)',
  },
  photoCaption: {
    textAlign: 'center',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginTop: '12px',
    letterSpacing: '0.02em',
  },
  sliderFrame: {
    width: '100%',
    height: '200px',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid var(--border-light)',
  },
  sliderBgBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'blur(20px) brightness(0.95)',
    opacity: 0.35,
    transform: 'scale(1.15)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  sliderImgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sliderImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    borderRadius: '12px',
  },
  sliderOverlay: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    gap: '8px',
    zIndex: 10,
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  sliderActionBtn: {
    background: 'rgba(255, 255, 255, 0.95)',
    color: 'var(--text-main)',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.15s ease',
  },
  sliderNavBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255, 255, 255, 0.75)',
    color: 'var(--text-main)',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    zIndex: 5,
    lineHeight: 0,
    transition: 'all 0.2s',
  },
  sliderCounter: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.4)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '10px',
    backdropFilter: 'blur(4px)',
    zIndex: 5,
  },
  sliderPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  placeholderImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(253, 114, 150, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'background 0.2s',
  },
  combinedStoryFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-light)',
    gap: '20px',
    flexWrap: 'wrap',
  },
  storyDetailsSide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 10px',
    alignItems: 'flex-start',
  },
  partnerNames: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  anniversaryRowInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
  },
  editDateBtnInline: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '4px',
    opacity: 0.7,
    transition: 'opacity 0.2s, color 0.2s',
  },
  storyCounterSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: '0 0 auto',
  },
  daysNumCombined: {
    fontSize: '2.5rem',
    fontWeight: '800',
    lineHeight: '1',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  daysLabelCombined: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '2px',
  },
  dateEditorInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dateInputInline: {
    padding: '4px 8px',
    fontSize: '0.85rem',
    height: '28px',
    maxWidth: '140px',
  },
  editorBtnInline: {
    padding: '4px 6px',
    height: '28px',
    width: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'color 0.2s',
  },
  uploadArea: {
    background: 'rgba(253, 114, 150, 0.05)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '12px',
    minHeight: 'auto',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  thumbnailCheckbox: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: 'var(--primary)',
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

// Add hover behavior and transitions for slider elements
if (typeof window !== 'undefined') {
  const css = `
    .slider-frame-hover:hover .slider-overlay-hover {
      opacity: 1 !important;
    }
    .edit-date-btn-hover:hover {
      color: var(--primary) !important;
      opacity: 1 !important;
    }
    .slider-placeholder-hover:hover img {
      transform: scale(1.04);
    }
    .slider-placeholder-hover:hover .placeholder-overlay-hover {
      background: rgba(253, 114, 150, 0.25) !important;
    }
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
    @media (max-width: 820px) {
      .welcome-quote-divider {
        border-left: none !important;
        border-top: 1.5px solid rgba(253, 114, 150, 0.2) !important;
        padding-left: 0 !important;
        padding-top: 16px !important;
        max-width: 100% !important;
      }
    }
    @media (max-width: 600px) {
      .combined-footer-responsive {
        flex-direction: column !important;
        gap: 16px !important;
        align-items: center !important;
        text-align: center !important;
      }
      .combined-footer-responsive > div {
        align-items: center !important;
        text-align: center !important;
      }
    }
    @media (max-width: 500px) {
      .welcome-widget {
        gap: 12px !important;
      }
      .welcome-quote-divider {
        max-width: 100% !important;
        flex: 1 1 100% !important;
      }
      .countdown-card {
        min-width: 55px;
        padding: 8px 12px;
      }
      .countdown-number {
        font-size: 1.4rem;
      }
      .countdown-label {
        font-size: 0.65rem;
      }
      .memoriesTeaserGrid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
      }
      .teaserCard {
        height: 110px;
      }
      .statsContainer {
        grid-template-columns: 1fr 1fr !important;
      }
    }
  `;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
