import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { Issue, Comment } from '../types';
import { ThumbsUp, CheckCircle, MessageSquare, MapPin, Calendar, Clock, AlertCircle, Send, ArrowLeft, Share2, Copy } from 'lucide-react';

const REACTION_EMOJIS: Record<string, string> = {
  love: '❤️',
  outraged: '😮',
  hopeful: '🙏',
  appreciative: '👏',
  sad: '😢'
};

const REACTION_LABELS: Record<string, string> = {
  love: 'Solidarity',
  outraged: 'Outraged',
  hopeful: 'Hopeful',
  appreciative: 'Appreciate',
  sad: 'Concerned'
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Pothole: '🕳️',
  'Street Light': '💡',
  'Water Leakage': '💧',
  Garbage: '🗑️',
  'Road Damage': '🚧',
  Encroachment: '🏗️',
  'Noise Pollution': '🔊',
  Other: '📍'
};

const CATEGORY_COLORS: Record<string, string> = {
  Pothole: '#DC2626',
  'Street Light': '#D97706',
  'Water Leakage': '#3B82F6',
  Garbage: '#6B7280',
  'Road Damage': '#92400E',
  Encroachment: '#7C3AED',
  'Noise Pollution': '#0891B2',
  Other: '#4B5563'
};

const getDepartmentForCategory = (category: string): string => {
  if (category === 'Pothole' || category === 'Road Damage') return 'Public Works Department (PWD)';
  if (category === 'Street Light') return 'Electricity Board';
  if (category === 'Garbage') return 'Sanitation Department';
  if (category === 'Water Leakage') return 'Water & Sewage Board';
  if (category === 'Encroachment') return 'Urban Planning & Encroachment';
  if (category === 'Noise Pollution') return 'Pollution Control Board';
  return 'General Administration';
};

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user, showToast, t } = useApp();
  const navigate = useNavigate();

  // State managers
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Status adjustment state (reporter only)
  const [statusNote, setStatusNote] = useState('');
  const [targetStatus, setTargetStatus] = useState<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Resolved');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Map tracking ref
  const mapRef = useRef<any>(null);

  // Fetch single issue details
  const fetchIssueDetails = async () => {
    try {
      const res = await fetch(`/api/issues/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIssue(data);
        setTargetStatus(data.status);
      } else {
        showToast('Issue not found or was deleted.', 'danger');
        navigate('/feed');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading issue details.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [id]);

  // Leaflet initialization for coordinates focus
  useEffect(() => {
    if (!issue || !issue.location?.lat || !issue.location?.lng) return;

    const L = (window as any).L;
    if (!L) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const detailMap = L.map('detail-focused-map', {
      zoomControl: false,
      scrollWheelZoom: false
    }).setView([issue.location.lat, issue.location.lng], 15);
    mapRef.current = detailMap;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(detailMap);

    const markerColor = CATEGORY_COLORS[issue.category] || '#2563EB';

    const customIcon = L.divIcon({
      html: `<div style="background-color: ${markerColor};" class="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-base shadow-xl">${CATEGORY_EMOJIS[issue.category] || '📍'}</div>`,
      className: 'custom-detail-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker([issue.location.lat, issue.location.lng], { icon: customIcon }).addTo(detailMap);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [issue]);

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('Please sign in to join the neighborhood discussion.', 'warning');
      return;
    }
    if (!commentText.trim()) return;

    setCommenting(true);
    try {
      const res = await fetch(`/api/issues/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });

      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        setCommentText('');
        showToast('Comment posted! +10 XP earned. 💬', 'success');
      } else {
        showToast('Failed to post comment.', 'danger');
      }
    } catch (e) {
      showToast('Error connecting to database.', 'danger');
    } finally {
      setCommenting(false);
    }
  };

  // Upvote Support
  const handleUpvote = async () => {
    if (!token) {
      showToast('Please sign in to support this report.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/issues/${id}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        showToast('Support added! +5 XP earned. 👍', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add support.', 'danger');
      }
    } catch (e) {
      showToast('Upvote error.', 'danger');
    }
  };

  // Verify Resolution checkmark click
  const handleVerifyResolution = async () => {
    if (!token) {
      showToast('Please sign in to verify this resolution.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/issues/${id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        showToast('Verification logged! Thank you for inspecting. ✔️', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Verification failed.', 'danger');
      }
    } catch (e) {
      showToast('Error logging verification.', 'danger');
    }
  };

  // Status Change submission (reporter only)
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!statusNote.trim()) {
      showToast('Please enter a note explaining this status change.', 'warning');
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/issues/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: targetStatus,
          note: statusNote
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        setStatusNote('');
        showToast(`Issue status changed to "${targetStatus}"! 🏛️`, 'success');
      } else {
        showToast('Failed to update status.', 'danger');
      }
    } catch (er) {
      showToast('Connection exception.', 'danger');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    if (!issue) return;
    const url = window.location.href;
    const text = `🚨 *CivicPulse Alert:* ${CATEGORY_EMOJIS[issue.category]} *${issue.title}*\n\nStatus: ${issue.status}\nLocation: ${issue.location.address}\n\nHelp verify or join the resolution effort here: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Handle Reaction Click
  const handleReactionClick = async (reactionType: string) => {
    if (!token) {
      showToast('Please sign in to react to this issue.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/issues/${id}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reactionType })
      });
      if (res.ok) {
        const updated = await res.json();
        setIssue(updated);
        showToast(`Reacted with ${REACTION_EMOJIS[reactionType]}! +3 XP earned. 🎭`, 'success');
      } else {
        showToast('Failed to add reaction.', 'danger');
      }
    } catch (e) {
      showToast('Error sending reaction.', 'danger');
    }
  };

  // Copy Civic Bulletin Message
  const handleCopyBulletin = () => {
    if (!issue) return;
    const url = window.location.href;
    const bulletText = `🏛️ *CivicPulse Neighborhood Action Bulletin* 🏛️\n\n📢 *Issue Reported:* ${CATEGORY_EMOJIS[issue.category]} ${issue.title}\n📍 *Location:* ${issue.location.address}\n⚠️ *Severity:* ${issue.severity} Priority\n📊 *Current Status:* ${issue.status}\n🤝 *Supports:* ${issue.upvotes?.length || 0} Citizens\n\nJoin the neighborhood discussion and support the resolution here: ${url}`;
    navigator.clipboard.writeText(bulletText);
    showToast('Civic Bulletin copied! Share it with your neighborhood group. 📋', 'success');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-slate-500 mt-4 font-semibold text-sm">Opening civic case file...</p>
      </div>
    );
  }

  if (!issue) return null;

  // Level display styling helpers
  const getLevelColors = (level?: string) => {
    switch (level) {
      case 'Legend': return { fill: '#F59E0B', bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-600' };
      case 'Champion': return { fill: '#7C3AED', bg: 'bg-purple-100 text-purple-800 border-purple-200', text: 'text-purple-600' };
      case 'Guardian': return { fill: '#3B82F6', bg: 'bg-blue-100 text-blue-800 border-blue-200', text: 'text-blue-600' };
      default: return { fill: '#6B7280', bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'text-slate-500' };
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const reporterStyle = getLevelColors(issue.reportedByLevel);
  const isReporter = user && issue.reportedBy === user._id;
  const userUpvoted = user && issue.upvotes?.includes(user._id);
  const userVerified = user && issue.verifiedBy?.includes(user._id);

  let statusColor = 'bg-red-50 text-red-700 border-red-100';
  if (issue.status === 'In Progress') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
  else if (issue.status === 'Resolved') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
  else if (issue.status === 'Closed') statusColor = 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="issue-detail-page">
      
      {/* Back button and share */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <Link to="/feed" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={handleWhatsAppShare} className="btn btn-outline py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 cursor-pointer">
            <Share2 className="w-4 h-4" />
            Share to WhatsApp
          </button>
          
          <button onClick={handleCopyBulletin} className="btn btn-outline py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 border-blue-200 text-blue-700 bg-blue-50/20 hover:bg-blue-50 cursor-pointer" title="Copy Action Bulletin text">
            <Copy className="w-4 h-4" />
            Copy Action Bulletin
          </button>
        </div>
      </div>

      {/* Main Grid: Left Side details, Right Side interactive controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side (Dossier + Media) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Headline Details */}
          <div className="custom-card p-6 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${statusColor}`}>
                Status: {issue.status}
              </span>
              <div className="flex gap-2 text-xs font-semibold text-slate-400 font-mono">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(issue.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
              {CATEGORY_EMOJIS[issue.category] || '📍'} {issue.title}
            </h1>
            
            {/* Geolocation Tag and Escalations */}
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{issue.location?.address || 'Mumbai location area'}</span>
            </div>

            {issue.isEscalated && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 mt-4 items-start text-xs text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold">🚨 Automated Senior Escalation Protocol</h4>
                  <p className="text-slate-500 mt-1 leading-relaxed">No update or change of status has been recorded on this complaint within 48 hours of reporting. Ticket has been automatically routed to the Ward Officer’s priority desk.</p>
                </div>
              </div>
            )}

            {/* AI Prompted description */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-6 border-t pt-4">
              {issue.description}
            </p>

            {/* AI Tags list */}
            {issue.aiAnalysis?.tags && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {issue.aiAnalysis.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 font-semibold px-2.5 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Interactive Community Reactions */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Community Vibe & Reactions</h4>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
                  const usersReacted = issue.reactions?.[type] || [];
                  const userHasReacted = user && usersReacted.includes(user._id);
                  return (
                    <button
                      key={type}
                      onClick={() => handleReactionClick(type)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer hover:scale-[1.03] active:scale-95 ${
                        userHasReacted
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base leading-none">{emoji}</span>
                      <span className="font-bold text-[10px] uppercase tracking-wide">{REACTION_LABELS[type]}</span>
                      {usersReacted.length > 0 && (
                        <span className={`text-[10px] ml-1.5 px-2 py-0.2 rounded-full font-black ${userHasReacted ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {usersReacted.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Official Municipal Resolution Card */}
          {(issue.officialResponse || issue.resolvedImage) && (
            <div className="custom-card p-6 bg-gradient-to-br from-indigo-900 to-slate-950 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl flex items-center gap-1.5 shadow">
                <span>🏛️</span>
                <span>{t('OFFICIAL RESOLUTION')}</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 px-2.5 py-0.5 rounded font-black tracking-wider uppercase font-mono">
                    {t(getDepartmentForCategory(issue.category))}
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-2 flex items-center gap-2">
                    <span>🎉</span>
                    <span>{t('Case Closed & Resolved!')}</span>
                  </h3>
                </div>

                {issue.officialResponse && (
                  <div className="bg-indigo-950/50 border border-indigo-800/40 p-4 rounded-xl relative">
                    <span className="absolute bottom-2 right-3 text-[9px] font-black tracking-wider text-indigo-400 flex items-center gap-1">
                      <span>✨</span>
                      <span>GEMINI AI AUTODRAFT</span>
                    </span>
                    <h4 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">{t('Official Statement to Citizenry')}</h4>
                    <p className="text-xs text-slate-200 leading-relaxed italic font-medium pr-10">
                      "{issue.officialResponse}"
                    </p>
                  </div>
                )}

                {issue.resolvedImage && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">{t('Before & After Repair Comparison')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Before (Original complaint photo) */}
                      {issue.images && issue.images[0] && (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800">
                          <img src={issue.images[0]} alt="Original Issue" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                          <span className="absolute top-2 left-2 bg-red-600/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                            {t('Before (Reported)')}
                          </span>
                        </div>
                      )}
                      
                      {/* After (Repaired photo) */}
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800">
                        <img src={issue.resolvedImage} alt="Repaired Issue" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute top-2 left-2 bg-emerald-500/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {t('After Repair (Fixed)')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Showcase slider */}
          {issue.images && issue.images.length > 0 && (
            <div className="custom-card p-4 bg-white">
              <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wide">Issue Media Portfolio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {issue.images.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={img} alt={`Complaint Image ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Status Timeline */}
          <div className="custom-card p-6 bg-white">
            <h3 className="text-sm font-extrabold text-slate-800 mb-6 uppercase tracking-wide">Resolution Status Log</h3>
            <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
              {issue.statusHistory && issue.statusHistory.map((hist, hIdx) => {
                let statusDot = 'bg-slate-300 ring-slate-100';
                if (hist.status === 'Open') statusDot = 'bg-red-500 ring-red-100';
                else if (hist.status === 'In Progress') statusDot = 'bg-amber-500 ring-amber-100';
                else if (hist.status === 'Resolved') statusDot = 'bg-emerald-500 ring-emerald-100';

                return (
                  <div key={hIdx} className="relative">
                    {/* Ring dot */}
                    <span className={`absolute left-[-31px] top-1 w-4 h-4 rounded-full ring-4 ${statusDot}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-800">Status Changed to "{hist.status}"</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {new Date(hist.createdAt).toLocaleDateString()} at {new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">"{hist.note}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discussion Forum (Comments) */}
          <div className="custom-card p-6 bg-white space-y-6">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Neighborhood Discussion ({issue.comments?.length || 0})</h3>
            
            {/* Form */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <input
                type="text"
                placeholder={token ? "Add a constructive comment to earn +10 XP..." : "Please log in to participate in the conversation."}
                disabled={!token || commenting}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="custom-input flex-1 text-sm py-2.5"
              />
              <button
                type="submit"
                disabled={!token || commenting || !commentText.trim()}
                className="btn btn-primary px-4 shadow cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4 divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {issue.comments && issue.comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-semibold">No comments posted yet. Start the conversation!</p>
              ) : (
                issue.comments && issue.comments.map((comm) => {
                  const commStyle = getLevelColors(comm.userLevel);
                  return (
                    <div key={comm._id} className="pt-4 flex gap-3.5 items-start">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: commStyle.fill }}>
                        {getInitials(comm.userName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800">{comm.userName || 'Citizen'}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold border uppercase ${commStyle.bg}`}>
                            {comm.userLevel || 'Citizen'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(comm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{comm.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Side Controls (Maps + Action Module) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Small Location Map */}
          <div className="custom-card p-4 bg-white flex flex-col justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 mb-3 uppercase tracking-wide">Incident Map Location</h3>
            <div className="w-full h-44 rounded-xl border border-slate-200 overflow-hidden relative mb-2">
              <div id="detail-focused-map" className="absolute inset-0 z-10 w-full h-full" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">📍 Lat: {issue.location?.lat?.toFixed(5)} • Lng: {issue.location?.lng?.toFixed(5)}</p>
          </div>

          {/* Action Module Box */}
          <div className="custom-card p-6 bg-white border-t-4 border-t-blue-500">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wide">Interactive Actions</h3>
            
            <div className="space-y-4">
              
              {/* Upvote support */}
              <button
                onClick={handleUpvote}
                className={`btn w-full py-3 text-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                  userUpvoted ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                {userUpvoted ? 'Supporting This Complaint' : 'I Support This Complaint'}
              </button>

              {/* Citizen verifications */}
              <button
                onClick={handleVerifyResolution}
                className={`btn w-full py-3 text-sm flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 cursor-pointer ${
                  userVerified ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                I Verify This Is Resolved
              </button>

              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Verifications</span>
                <span className="text-xl font-black text-slate-800 block mt-1">
                  {issue.verifiedBy?.length || 0} / 5
                </span>
                <p className="text-[9px] text-slate-400 leading-tight mt-1.5">5 community inspector verifications will auto-resolve this complaint as verified.</p>
              </div>

            </div>
          </div>

          {/* Action Module Reporter Controls (Only shown for original reporter) */}
          {isReporter && (
            <div className="custom-card p-6 bg-white border-t-4 border-t-emerald-500">
              <h3 className="text-sm font-extrabold text-emerald-800 mb-3 uppercase tracking-wide">Reporter Control Deck</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">As the original author, you have direct clearance to adjust incident status alongside resolution notes.</p>

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1">Incident Status</label>
                  <select
                    value={targetStatus}
                    onChange={e => setTargetStatus(e.target.value as any)}
                    className="custom-input cursor-pointer py-2 text-xs"
                  >
                    <option value="Open">Open 🔴</option>
                    <option value="In Progress">In Progress 🟡</option>
                    <option value="Resolved">Resolved 🟢</option>
                    <option value="Closed">Closed ⚫</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1">State Explanation / Notes</label>
                  <textarea
                    placeholder="Provide details on the resolution, e.g. Contractor completed the repaving on 28th June..."
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    className="custom-input text-xs min-h-[80px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="btn btn-success w-full py-2.5 text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Publish Update'}
                </button>
              </form>
            </div>
          )}

          {/* Incident Reporter Dossier info */}
          <div className="custom-card p-5 bg-slate-50 border-none">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Incident Reporter Case</h4>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow" style={{ backgroundColor: reporterStyle.fill }}>
                {getInitials(issue.reportedByName)}
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800 leading-none">{issue.reportedByName || 'Citizen Reporter'}</h5>
                <span className={`text-[9px] font-bold uppercase mt-1 px-1.5 py-0.2 rounded border ${reporterStyle.bg} inline-block leading-none`}>
                  {issue.reportedByLevel || 'Citizen'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
