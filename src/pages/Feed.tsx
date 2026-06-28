import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { Issue } from '../types';
import { Search, MapPin, Grid, Map, Share2, MessageSquare, ThumbsUp, CheckCircle, AlertCircle, ArrowUp } from 'lucide-react';

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

export const Feed: React.FC = () => {
  const { token, showToast, user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // State managers
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');

  // Map instance tracker
  const mapRef = useRef<any>(null);

  // Parse view from URL params if present
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView === 'map') {
      setViewMode('map');
    } else {
      setViewMode('cards');
    }
  }, [searchParams]);

  // Fetch Issues based on filters
  const fetchIssues = () => {
    setLoading(true);
    let url = '/api/issues?';
    
    if (category) url += `category=${category}&`;
    if (severity) url += `severity=${severity}&`;
    if (status) url += `status=${status}&`;
    if (search) url += `search=${search}&`;
    if (nearMeEnabled && coords) {
      url += `lat=${coords.lat}&lng=${coords.lng}&`;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setIssues(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching issues:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIssues();
  }, [category, severity, status, nearMeEnabled, coords]);

  // Geolocation trigger for Near Me sorting
  const handleNearMeClick = () => {
    if (nearMeEnabled) {
      setNearMeEnabled(false);
      return;
    }

    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    showToast('Acquiring your coordinates... 🛰️', 'info');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMeEnabled(true);
        showToast('Sorting by absolute physical proximity!', 'success');
      },
      err => {
        console.error('Geolocation error:', err);
        showToast('Could not fetch location. Defaulting to standard view.', 'danger');
      },
      { enableHighAccuracy: true }
    );
  };

  // Upvote Action
  const handleUpvote = async (issueId: string) => {
    if (!token) {
      showToast('Please login to support issue reports.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/issues/${issueId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        // Update local state list
        setIssues(prev => prev.map(iss => iss._id === issueId ? { ...iss, upvotes: updated.upvotes, isVerified: updated.isVerified, verifiedBy: updated.verifiedBy } : iss));
        showToast('Support added! +5 XP earned. 👍', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add support.', 'danger');
      }
    } catch (e) {
      showToast('Error upvoting issue.', 'danger');
    }
  };

  // WhatsApp Share Helper
  const handleWhatsAppShare = (issue: Issue) => {
    const url = `${window.location.origin}/issue/${issue._id}`;
    const text = `🚨 *Civic Issue Alert on CivicPulse* 🚨\n\n*Issue:* ${CATEGORY_EMOJIS[issue.category] || ''} ${issue.title}\n*Category:* ${issue.category}\n*Status:* ${issue.status}\n*Location:* ${issue.location.address}\n\nHelp our community fix this! View details and upvote here: ${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Initialize and update Map View
  useEffect(() => {
    if (viewMode !== 'map' || issues.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default map focus (Mumbai) or acquired coordinates
    const focusCoords: [number, number] = coords ? [coords.lat, coords.lng] : [19.076, 72.8777];
    const feedMap = L.map('feed-interactive-map').setView(focusCoords, 12);
    mapRef.current = feedMap;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(feedMap);

    // Place coordinates marker for user if Near Me active
    if (nearMeEnabled && coords) {
      L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
          html: '📍',
          className: 'text-2xl',
          iconSize: [20, 20]
        })
      }).addTo(feedMap).bindPopup('<b>You are here! 🛰️</b>');
    }

    // Add markers for each issue
    issues.forEach(iss => {
      if (!iss.location?.lat || !iss.location?.lng) return;

      const markerColor = CATEGORY_COLORS[iss.category] || '#2563EB';
      
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${markerColor};" class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-lg transform transition hover:scale-110">${CATEGORY_EMOJIS[iss.category] || '📍'}</div>`,
        className: 'custom-map-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([iss.location.lat, iss.location.lng], { icon: customIcon })
        .addTo(feedMap)
        .bindPopup(`
          <div style="font-family: inherit; width: 220px;" class="p-1">
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px; background-color: #f1f5f9; color: #475569;">${iss.category}</span>
            <h4 style="margin: 0; font-weight: 800; color: #1e293b; font-size: 13px; line-clamp: 1;">${iss.title}</h4>
            <p style="margin: 4px 0 8px; color: #64748b; font-size: 11px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${iss.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; pt: 6px; margin-top: 6px;">
              <span style="font-weight: bold; font-size: 11px; color: #10b981;">👍 ${iss.upvotes?.length || 0} supports</span>
              <a href="/issue/${iss._id}" style="font-weight: bold; color: #2563eb; text-decoration: none; font-size: 11px;">View Case →</a>
            </div>
          </div>
        `);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode, issues, coords]);

  // Initials Avatar generator
  const getInitials = (name?: string) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getLevelColors = (level?: string) => {
    switch (level) {
      case 'Legend': return { fill: '#F59E0B', text: 'text-amber-600' };
      case 'Champion': return { fill: '#7C3AED', text: 'text-purple-600' };
      case 'Guardian': return { fill: '#3B82F6', text: 'text-blue-600' };
      default: return { fill: '#6B7280', text: 'text-slate-500' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="feed-page">
      
      {/* Title Header and layout triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Active Citizen Feed</h1>
          <p className="text-sm text-slate-500 mt-1">Explore, verify, and resolve hyperlocal issues alongside your community guardians.</p>
        </div>

        {/* View Layout Toggle button */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-center">
          <button
            onClick={() => { setViewMode('cards'); setSearchParams({}); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Grid className="w-4 h-4" />
            Grid Feed
          </button>
          <button
            onClick={() => { setViewMode('map'); setSearchParams({ view: 'map' }); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Map className="w-4 h-4" />
            Live Map
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Search Input */}
          <div className="relative flex items-center lg:col-span-2">
            <span className="absolute left-3.5 text-slate-400"><Search className="w-4 h-4" /></span>
            <input
              type="text"
              placeholder="Search issues by title, description, or tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="custom-input w-full !pl-10"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="custom-input cursor-pointer"
          >
            <option value="">All Categories 📍</option>
            <option value="Pothole">Potholes 🕳️</option>
            <option value="Street Light">Street Lights 💡</option>
            <option value="Water Leakage">Water Leakage 💧</option>
            <option value="Garbage">Garbage Pile 🗑️</option>
            <option value="Road Damage">Road Damage 🚧</option>
            <option value="Encroachment">Encroachments 🏗️</option>
            <option value="Noise Pollution">Noise Pollution 🔊</option>
            <option value="Other">Other 📍</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="custom-input cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open 🔴</option>
            <option value="In Progress">In Progress 🟡</option>
            <option value="Resolved">Resolved 🟢</option>
            <option value="Closed">Closed ⚫</option>
          </select>

          {/* Near Me toggle button */}
          <button
            onClick={handleNearMeClick}
            className={`btn py-2 px-4 border text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              nearMeEnabled
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4.5 h-4.5" />
            {nearMeEnabled ? 'Sorting Near Me' : 'Near Me (GPS)'}
          </button>

        </div>
        
        {/* Active searches/filters trigger */}
        {search && (
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-blue-600 bg-blue-50/50 border border-blue-100 p-2 rounded-lg">
            <span>Filtering issues by search query...</span>
            <button onClick={fetchIssues} className="btn py-1 px-3 bg-blue-600 text-white rounded text-[10px] cursor-pointer">Apply Filter</button>
          </div>
        )}
      </div>

      {/* Main Contents based on View Mode */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
          <p className="text-slate-500 mt-4 font-semibold text-sm">Synchronizing neighborhood database...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl shadow-inner">
          <span className="text-5xl mb-4 block">🏝️</span>
          <h3 className="text-lg font-extrabold text-slate-800">All Quiet Here!</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1 mb-6">No matching issues are found in this segment. Try updating your filters or report a new one.</p>
          <Link to="/report" className="btn btn-primary text-sm shadow-sm">Report a Civic Issue</Link>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map(issue => {
            let statusPill = 'bg-red-50 text-red-700 border-red-100';
            if (issue.status === 'In Progress') statusPill = 'bg-amber-50 text-amber-700 border-amber-100';
            else if (issue.status === 'Resolved') statusPill = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            else if (issue.status === 'Closed') statusPill = 'bg-slate-100 text-slate-700 border-slate-200';

            const userLvl = getLevelColors(issue.reportedByLevel);
            const userUpvoted = user && issue.upvotes?.includes(user._id);

            return (
              <div
                key={issue._id}
                className="custom-card bg-white flex flex-col justify-between overflow-hidden relative group"
                id={`issue-card-${issue._id}`}
              >
                
                {/* Verification Overlay checkmark */}
                {issue.isVerified && (
                  <span className="absolute top-4 right-4 text-emerald-500 z-10 cursor-help" title="Community Verified Report">
                    <CheckCircle className="w-5.5 h-5.5 fill-emerald-50" />
                  </span>
                )}

                {/* Card Top Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Status and Category Row */}
                    <div className="flex items-center justify-between gap-2 mb-3 max-w-[85%]">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusPill} uppercase`}>
                        {issue.status}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Image Thumbnail if exists */}
                    {issue.images && issue.images.length > 0 && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-slate-100 bg-slate-50 relative">
                        <img
                          src={issue.images[0]}
                          alt={issue.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        {/* Severity tag */}
                        <span className={`absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow ${
                          issue.severity === 'Critical' ? 'bg-red-500 text-white border-red-400' :
                          issue.severity === 'High' ? 'bg-orange-500 text-white border-orange-400' :
                          issue.severity === 'Medium' ? 'bg-amber-500 text-white border-amber-400' :
                          'bg-emerald-500 text-white border-emerald-400'
                        }`}>
                          {issue.severity} Priority
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-slate-800 line-clamp-1 mb-2 hover:text-blue-600 transition-colors">
                      <Link to={`/issue/${issue._id}`}>
                        {CATEGORY_EMOJIS[issue.category] || '📍'} {issue.title}
                      </Link>
                    </h3>

                    {/* Tags */}
                    {issue.aiAnalysis?.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {issue.aiAnalysis.tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="text-[9px] bg-slate-100 text-slate-500 font-semibold px-1.5 py-0.2 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Truncated Description */}
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>

                  {/* Geolocation Tag and Escalation Alerts */}
                  <div className="space-y-3">
                    {/* Distance / Location line */}
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{issue.location?.address || 'Mumbai Area'}</span>
                      {issue.distance !== undefined && (
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded shrink-0">
                          {issue.distance.toFixed(1)} km away
                        </span>
                      )}
                    </div>

                    {/* Escalation Alert Display */}
                    {issue.isEscalated && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex gap-2 items-start text-[10px] text-rose-800 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold">🚨 Auto-Escalated to Ward Officer</p>
                          <p className="text-slate-500 mt-0.5 leading-tight">No resolution initiated within 48 hours.</p>
                        </div>
                      </div>
                    )}

                    {/* Reporter Info Line */}
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: userLvl.fill }}>
                          {getInitials(issue.reportedByName)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-700 leading-none">{issue.reportedByName || 'Citizen'}</span>
                          <span className={`text-[8px] font-bold uppercase mt-0.5 block ${userLvl.text}`}>{issue.reportedByLevel || 'Citizen'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Card Interaction Actions */}
                <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-2">
                  {/* Upvote Button */}
                  <button
                    onClick={() => handleUpvote(issue._id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userUpvoted
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${userUpvoted ? 'fill-white' : ''}`} />
                    <span>{issue.upvotes?.length || 0} supports</span>
                  </button>

                  {/* Comment trigger */}
                  <Link
                    to={`/issue/${issue._id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{issue.comments?.length || 0} comment</span>
                  </Link>

                  {/* WhatsApp Share trigger */}
                  <button
                    onClick={() => handleWhatsAppShare(issue)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="Share to WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Map View Element */
        <div className="rounded-2xl border border-slate-200 overflow-hidden relative shadow-lg min-h-[500px]" id="feed-map-container">
          <div id="feed-interactive-map" className="absolute inset-0 z-10 w-full h-full" />
        </div>
      )}

    </div>
  );
};
