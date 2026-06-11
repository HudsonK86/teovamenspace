import { useState, useRef } from 'react';
import { Plus, X, Camera, Trash2, BookOpen, AlertCircle, Pencil } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function Memories({ user, partners = [], memories, setMemories, token }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeIndexes, setActiveIndexes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const [editingMemory, setEditingMemory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);

  const editFileInputRef = useRef(null);

  const [editDraggedIdx, setEditDraggedIdx] = useState(null);

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

  const handleNextImage = (memoryId, maxIndex) => {
    setActiveIndexes(prev => ({
      ...prev,
      [memoryId]: ((prev[memoryId] || 0) + 1) % maxIndex
    }));
  };

  const handlePrevImage = (memoryId, maxIndex) => {
    setActiveIndexes(prev => ({
      ...prev,
      [memoryId]: ((prev[memoryId] || 0) - 1 + maxIndex) % maxIndex
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date) {
      setError('Title and date are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('date', date);
      if (imageFiles.length > 0) {
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save memory');

      // Add to list and close form
      setMemories(prev => [data, ...prev]);
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setImageFiles([]);
      setImagePreviews([]);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/memories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartEdit = (memory) => {
    setEditingMemory(memory);
    setEditTitle(memory.title);
    setEditDescription(memory.description || '');
    
    // Format date to YYYY-MM-DD
    const formattedDate = new Date(memory.date).toISOString().split('T')[0];
    setEditDate(formattedDate);
    
    setEditExistingImages(memory.images || []);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setError('');
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

  const handleEditDragOver = (e) => {
    e.preventDefault();
  };

  const handleEditDrop = (e) => {
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle || !editDate) {
      setError('Title and date are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      formData.append('date', editDate);
      formData.append('existingImageIds', JSON.stringify(editExistingImages.map(img => img.id)));
      if (editImageFiles.length > 0) {
        editImageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/memories/${editingMemory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update memory');

      // Update in memory list
      setMemories(prev => prev.map(m => m.id === editingMemory.id ? data : m));
      setEditingMemory(null);
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
          <h2 className="title-serif" style={styles.title}>our memory journal</h2>
          <p style={styles.subtitle}>A private shared diary of dates, trips, anniversaries, and precious moments.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Add Memory
        </button>
      </div>

      {/* Add Memory Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative', maxWidth: '550px' }}>
            <button 
              onClick={() => setShowAddForm(false)} 
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignHTML: 'center', gap: '8px' }}>
              <BookOpen size={20} color="var(--primary)" />
              Add a New Memory
            </h3>
            
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
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
                    <Camera size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Drag & drop photos here</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>or click to browse (multiple allowed)</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Memory Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Our First Anniversary Dinner, Trip to Da Nang" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description & Story</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Write details about what we did, what we talked about, or funny moments..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Posting Memory...' : 'Save Memory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative', maxWidth: '550px' }}>
            <button 
              onClick={() => setEditingMemory(null)} 
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} color="var(--primary)" />
              Edit Memory
            </h3>
            
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Drag & Drop Image Uploader */}
              <div 
                style={styles.uploadArea} 
                onDragOver={handleEditDragOver}
                onDrop={handleEditDrop}
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
                          style={{ opacity: editDraggedIdx?.isExisting && editDraggedIdx?.idx === idx ? 0.5 : 1 }}
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
                        style={{ opacity: !editDraggedIdx?.isExisting && editDraggedIdx?.idx === index ? 0.5 : 1 }}
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
                      </div>
                    ))}
                    <div className="add-more-thumbnail" onClick={() => editFileInputRef.current.click()}>
                      <Plus size={18} />
                      <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Add More</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.uploadPrompt}>
                    <Camera size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Drag & drop photos here</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>or click to browse (multiple allowed)</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Memory Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Our First Anniversary Dinner, Trip to Da Nang" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description & Story</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Write details about what we did, what we talked about, or funny moments..." 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Memories Timeline */}
      {memories.length > 0 ? (
        <div className="timeline">
          {memories.map(memory => {
            const imagesList = memory.images && memory.images.length > 0
              ? memory.images.map(img => img.url)
              : (memory.imageUrl ? [memory.imageUrl] : []);

            const activeIndex = activeIndexes[memory.id] || 0;
            const memoryUrl = imagesList.length > 0 ? imagesList[activeIndex] : null;
            const memoryFullUrl = memoryUrl
              ? (memoryUrl.startsWith('/uploads/') ? `${API_BASE_URL}${memoryUrl}` : memoryUrl)
              : null;
              
            const author = (user && user.id === memory.authorId)
              ? user
              : (partners.find(p => p.id === memory.authorId) || memory.author);
            
            return (
              <div key={memory.id} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-date">
                  {new Date(memory.date).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                <div className="glass-panel memory-card" style={styles.memoryCard}>
                  {memoryFullUrl && (
                    <div className="carousel-container">
                      <img src={memoryFullUrl} alt={memory.title} className="memory-img" />
                      
                      {imagesList.length > 1 && (
                        <>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage(memory.id, imagesList.length);
                            }}
                            className="carousel-arrow left"
                            title="Previous Photo"
                          >
                            &lsaquo;
                          </button>
                          
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage(memory.id, imagesList.length);
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
                                  background: idx === activeIndex ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveIndexes(prev => ({ ...prev, [memory.id]: idx }));
                                }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="memory-body">
                    <div style={styles.memoryHeader}>
                      <h3 style={styles.memoryTitle}>{memory.title}</h3>
                      <div className="memory-actions">
                        <button 
                          onClick={() => handleStartEdit(memory)} 
                          className="memory-action-btn edit-btn"
                          style={styles.editBtn}
                          title="Edit Memory"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(memory.id)} 
                          className="memory-action-btn delete-btn"
                          style={styles.deleteBtn}
                          title="Delete Memory"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {memory.description && (
                      <p style={styles.memoryDesc}>{memory.description}</p>
                    )}
                    <div style={styles.memoryFooter}>
                      <div style={styles.authorBadge}>
                        <img 
                          src={author?.avatar ? (author.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${author.avatar}` : author.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                          alt={author?.name} 
                          style={styles.authorAvatar} 
                        />
                        <span style={styles.authorName}>Written by {author?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyTimeline} onClick={() => setShowAddForm(true)}>
          <BookOpen size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3>No memories added yet</h3>
          <p style={{ color: 'var(--text-muted)', cursor: 'pointer', marginTop: '8px' }}>
            Click here to record your first special moment together! 💖
          </p>
        </div>
      )}
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
  uploadArea: {
    border: '2px dashed var(--border-card)',
    borderRadius: 'var(--border-radius-sm)',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(255,255,255,0.15)',
    transition: 'border-color 0.2s',
  },
  uploadPrompt: {
    textAlign: 'center',
    padding: '20px',
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
    fontSize: '0.8rem',
    fontWeight: '600',
    padding: '6px',
    textAlign: 'center',
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
  memoryCard: {
    borderRadius: 'var(--border-radius-md)',
  },
  memoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  memoryTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  editBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'color 0.2s',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'color 0.2s',
  },
  memoryDesc: {
    fontSize: '1rem',
    color: 'var(--text-main)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    marginBottom: '16px',
  },
  memoryFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-light)',
  },
  authorBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  authorAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--primary)',
  },
  authorName: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  emptyTimeline: {
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
