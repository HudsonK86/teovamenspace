import React, { useState } from 'react';
import { Plus, X, Calendar, CheckSquare, Trash2, CheckCircle2, User, HelpCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function Events({ user, partners, events, setEvents, token }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // No shared newTasks object state needed

  const partner = partners.find(p => p.id !== user?.id);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!title || !date) {
      setError('Title and date are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, date, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event');

      setEvents(prev => [...prev, { ...data, checklist: [] }].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setTitle('');
      setDate('');
      setDescription('');
      setShowAddForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event and all its tasks?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Checklist interactions
  const handleTaskToggle = async (eventId, itemId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/checklist/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update task');

      // Update state
      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return {
            ...evt,
            checklist: evt.checklist.map(task => task.id === itemId ? data : task)
          };
        }
        return evt;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssignTask = async (eventId, itemId, userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/checklist/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedTo: userId || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error('Failed to assign task');

      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return {
            ...evt,
            checklist: evt.checklist.map(task => task.id === itemId ? data : task)
          };
        }
        return evt;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddTask = async (eventId, itemText) => {
    if (!itemText || !itemText.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add task');

      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return {
            ...evt,
            checklist: [...(evt.checklist || []), data]
          };
        }
        return evt;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (eventId, itemId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/checklist/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete task');

      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return {
            ...evt,
            checklist: evt.checklist.filter(task => task.id !== itemId)
          };
        }
        return evt;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 className="title-serif" style={styles.title}>our upcoming events</h2>
          <p style={styles.subtitle}>Plan dates, anniversaries, or trips and assign preparation duties to each other.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Create Event Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ position: 'relative' }}>
            <button onClick={() => setShowAddForm(false)} style={styles.closeBtn}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="var(--primary)" />
              Add Event / Milestone
            </h3>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} color="var(--danger)" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Event Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Flight to Da Lat, Birthday Dinner" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  placeholder="e.g. Table booked under Hudson, flight code VN123..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Events Board List */}
      {events.length > 0 ? (
        <div style={styles.eventsGrid}>
          {events.map(event => {
            const dateObj = new Date(event.date);
            const isPast = dateObj < new Date();
            
            return (
              <div key={event.id} className="glass-panel" style={{ ...styles.eventCard, opacity: isPast ? 0.75 : 1 }}>
                {/* Event Title Header */}
                <div style={styles.eventCardHeader}>
                  <div>
                    <h3 style={styles.eventTitle}>{event.title}</h3>
                    <div style={styles.eventDateRow}>
                      <Calendar size={14} color="var(--primary)" />
                      <span>
                        {dateObj.toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isPast && <span style={styles.pastBadge}>Past</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteEvent(event.id)} 
                    style={styles.deleteEventBtn}
                    title="Delete Event"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {event.description && (
                  <p style={styles.eventDesc}>{event.description}</p>
                )}

                {/* Event Checklist Section */}
                <div style={styles.checklistSection}>
                  <h4 style={styles.checklistTitle}>
                    <CheckSquare size={16} />
                    Preparation Checklist
                  </h4>

                  {/* Tasks List */}
                  <div className="checklist-container">
                    {event.checklist && event.checklist.length > 0 ? (
                      event.checklist.map(task => (
                        <div key={task.id} className="checklist-item">
                          
                          {/* Checkbox */}
                          <div 
                            className={`checklist-checkbox ${task.isCompleted ? 'checked' : ''}`}
                            onClick={() => handleTaskToggle(event.id, task.id, task.isCompleted)}
                          >
                            {task.isCompleted && <CheckCircle2 size={14} fill="currentColor" />}
                          </div>

                          {/* Task Text */}
                          <span className={`checklist-text ${task.isCompleted ? 'completed' : ''}`}>
                            {task.itemText}
                          </span>

                          {/* Task Assignment Dropdown */}
                          <div style={styles.assignmentWrapper}>
                            <select 
                              value={task.assignedTo || ''} 
                              onChange={(e) => handleAssignTask(event.id, task.id, e.target.value)}
                              style={styles.assignSelect}
                            >
                              <option value="">Unassigned</option>
                              <option value={user?.id}>For Me ({user?.name})</option>
                              {partner && <option value={partner.id}>For {partner.name}</option>}
                            </select>
                            
                            {/* Visual Avatar indicator */}
                            {(() => {
                              try {
                                const assignedUser = task.user
                                  ? ((user && user.id === task.user.id) 
                                    ? user 
                                    : (partners?.find(p => p.id === task.user.id) || task.user))
                                  : null;
                                
                                return assignedUser ? (
                                  <img 
                                    src={assignedUser.avatar ? (assignedUser.avatar.startsWith('/uploads/') ? `${API_BASE_URL}${assignedUser.avatar}` : assignedUser.avatar) : 'https://api.dicebear.com/7.x/adventurer/svg?seed=User'} 
                                    alt={assignedUser.name} 
                                    style={styles.assignedAvatar} 
                                    title={`Assigned to ${assignedUser.name}`}
                                  />
                                ) : (
                                  <div style={styles.unassignedIcon} title="Unassigned task">
                                    <HelpCircle size={16} />
                                  </div>
                                );
                              } catch (e) {
                                console.error("Error rendering task avatar:", e, task);
                                return (
                                  <div style={styles.unassignedIcon} title="Unassigned task">
                                    <HelpCircle size={16} />
                                  </div>
                                );
                              }
                            })()}
                          </div>

                          {/* Delete Task */}
                          <button 
                            onClick={() => handleDeleteTask(event.id, task.id)}
                            style={styles.deleteTaskBtn}
                            title="Delete Task"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={styles.noTasksText}>No preparation tasks added yet.</p>
                    )}
                  </div>

                  {/* Add Task Input Form */}
                  <EventChecklistInput 
                    eventId={event.id}
                    onAddTask={handleAddTask}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyEvents} onClick={() => setShowAddForm(true)}>
          <Calendar size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3>No events planned</h3>
          <p style={{ color: 'var(--text-muted)', cursor: 'pointer', marginTop: '8px' }}>
            Click here to plan your next anniversary, date night, or road trip! 🗺️
          </p>
        </div>
      )}
    </div>
  );
}

function EventChecklistInput({ eventId, onAddTask }) {
  const inputRef = React.useRef(null);
  
  const handleAdd = () => {
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    onAddTask(eventId, text);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={styles.addTaskRow}>
      <input 
        ref={inputRef}
        type="text" 
        className="form-input" 
        style={styles.addTaskInput}
        placeholder="+ Add packing item or task..." 
        defaultValue=""
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
      />
      <button 
        onClick={handleAdd}
        className="btn-primary"
        style={styles.addTaskBtn}
      >
        Add
      </button>
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
  eventsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  eventCard: {
    borderRadius: 'var(--border-radius-md)',
  },
  eventCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '16px',
  },
  eventTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  eventDateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  pastBadge: {
    background: 'rgba(0, 0, 0, 0.08)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  deleteEventBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
    borderRadius: '6px',
    transition: 'color 0.2s',
  },
  eventDesc: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    marginTop: '12px',
    lineHeight: '1.5',
  },
  checklistSection: {
    marginTop: '20px',
    background: 'rgba(255,255,255,0.2)',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-light)',
  },
  checklistTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--secondary)',
    marginBottom: '12px',
  },
  noTasksText: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '6px 0',
  },
  assignmentWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
  },
  assignSelect: {
    padding: '4px 8px',
    fontSize: '0.8rem',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    background: 'var(--card-bg)',
    outline: 'none',
    fontWeight: '500',
  },
  assignedAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1.5px solid var(--primary)',
  },
  unassignedIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  deleteTaskBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  addTaskRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  addTaskInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.9rem',
    borderRadius: '10px',
  },
  addTaskBtn: {
    padding: '8px 16px',
    fontSize: '0.9rem',
    borderRadius: '10px',
  },
  emptyEvents: {
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

if (typeof window !== 'undefined') {
  const css = `
    .checklist-item select {
      cursor: pointer;
    }
    .checklist-item:hover button {
      color: var(--danger) !important;
    }
  `;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
