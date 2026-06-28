import React, { useState, useEffect } from 'react';
import { useApp } from '../components/AppContext';
import { Navigate, Link } from 'react-router-dom';
import { User, Issue } from '../types';
import { Edit2, Save, Calendar, Award, CheckCircle, FileText, MessageSquare, Flame } from 'lucide-react';

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

const ALL_POSSIBLE_BADGES = [
  { name: 'First Report', icon: '📸', desc: 'Report your very first civic issue.' },
  { name: 'Community Watcher', icon: '👁️', desc: 'Have 10 or more reports verified by upvotes.' },
  { name: 'Legend Citizen', icon: '👑', desc: 'Reach 1000+ total XP threshold.' },
  { name: 'Team Player', icon: '🤝', desc: 'Post 20 or more constructive comments.' }
];

export const Profile: React.FC = () => {
  const { user, token, showToast, updateUserProfile } = useApp();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'activity'>('issues');
  
  // Inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!token || !user) return;

    // Fetch profile and issues
    fetch(`/api/users/profile/${user._id}`)
      .then(r => r.json())
      .then(data => {
        setProfileData(data.user);
        setEditedName(data.user.name);
        setUserIssues(data.issues || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching profile data:', err);
        setLoading(false);
      });
  }, [user, token]);

  if (!token) {
    return <Navigate to="/login?redirect=/profile" />;
  }

  if (loading || !profileData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-slate-500 mt-4 font-semibold text-sm">Loading your citizen dossier...</p>
      </div>
    );
  }

  // Level Styling Helpers
  const getLevelColors = (level: string) => {
    switch (level) {
      case 'Legend':
        return { fill: '#F59E0B', bg: 'bg-amber-100 text-amber-800 border-amber-200', badgeClass: 'border-amber-400' };
      case 'Champion':
        return { fill: '#7C3AED', bg: 'bg-purple-100 text-purple-800 border-purple-200', badgeClass: 'border-purple-400' };
      case 'Guardian':
        return { fill: '#3B82F6', bg: 'bg-blue-100 text-blue-800 border-blue-200', badgeClass: 'border-blue-400' };
      default:
        return { fill: '#6B7280', bg: 'bg-slate-100 text-slate-800 border-slate-200', badgeClass: 'border-slate-300' };
    }
  };

  const getXpProgress = (xp: number, level: string) => {
    let minXp = 0;
    let maxXp = 100;
    if (level === 'Guardian') {
      minXp = 100;
      maxXp = 500;
    } else if (level === 'Champion') {
      minXp = 500;
      maxXp = 1000;
    } else if (level === 'Legend') {
      return { percentage: 100, label: `${xp} XP (MAX LEVEL REACHED)` };
    }

    const percentage = Math.min(100, Math.max(0, ((xp - minXp) / (maxXp - minXp)) * 100));
    return { percentage, label: `${xp} / ${maxXp} XP to Next Tier` };
  };

  const levelStyle = getLevelColors(profileData.level);
  const xpProg = getXpProgress(profileData.xp, profileData.level);
  const initials = profileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Save edited name
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      showToast('Name cannot be empty.', 'warning');
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editedName })
      });

      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        updateUserProfile(updated);
        setIsEditingName(false);
        showToast('Name updated successfully!', 'success');
      } else {
        showToast('Failed to update name.', 'danger');
      }
    } catch (e) {
      showToast('Network error while saving profile.', 'danger');
    } finally {
      setSavingName(false);
    }
  };

  // Generate mock activities based on seeded status counts
  const getActivities = () => {
    const list = [];
    
    // Add reported issues as activities
    userIssues.forEach((issue, index) => {
      list.push({
        type: 'report',
        text: `Reported civic issue: "${issue.title}"`,
        xp: '+50 XP',
        date: new Date(issue.createdAt),
        id: `r-${index}`
      });

      if (issue.isVerified) {
        list.push({
          type: 'verify',
          text: `Your report "${issue.title}" was verified by community upvotes`,
          xp: '+25 XP',
          date: new Date(new Date(issue.createdAt).getTime() + 12 * 60 * 60 * 1000),
          id: `v-${index}`
        });
      }

      if (issue.status === 'Resolved') {
        list.push({
          type: 'resolve',
          text: `Issue successfully resolved! Original reporter reward.`,
          xp: '+100 XP',
          date: new Date(new Date(issue.createdAt).getTime() + 48 * 60 * 60 * 1000),
          id: `res-${index}`
        });
      }

      // Add self upvote
      list.push({
        type: 'upvote',
        text: `Upvoted issue report: "${issue.title}"`,
        xp: '+5 XP',
        date: new Date(issue.createdAt),
        id: `u-${index}`
      });

      // User comments
      issue.comments.filter(c => c.userId === profileData._id).forEach((comment, cIdx) => {
        list.push({
          type: 'comment',
          text: `Commented on: "${issue.title}"`,
          xp: '+10 XP',
          date: new Date(comment.createdAt),
          id: `c-${index}-${cIdx}`
        });
      });
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const activities = getActivities();
  const commentsPostedCount = userIssues.reduce((sum, issue) => {
    return sum + issue.comments.filter(c => c.userId === profileData._id).length;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="profile-container">
      
      {/* Profile Header Card */}
      <div className="custom-card p-6 md:p-8 bg-white mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          
          {/* Avatar Area */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-xl ring-4 ring-offset-2 ring-blue-500/20" style={{ backgroundColor: levelStyle.fill }}>
            {initials}
          </div>

          {/* User Dossier details */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="custom-input text-xl font-bold py-1 px-2.5 max-w-xs"
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer">
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{profileData.name}</h1>
                  <button onClick={() => setIsEditingName(true)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <span className={`px-3 py-1 rounded-full text-xs font-bold border self-center ${levelStyle.bg}`}>
                {profileData.level} Tier
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-2 justify-center md:justify-start">
              <Calendar className="w-4 h-4" />
              <span>Joined CivicPulse on {new Date(profileData.createdAt).toLocaleDateString()}</span>
            </div>

            {/* XP ProgressBar */}
            <div className="mt-6 max-w-md">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-slate-500 uppercase tracking-wide">Civic Progress</span>
                <span className="text-blue-600 font-mono">{xpProg.label}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpProg.percentage}%`, backgroundColor: levelStyle.fill }} />
              </div>
            </div>
          </div>

          {/* Simple CTA info */}
          <div className="text-center bg-blue-50/50 border border-blue-100 p-4 rounded-xl min-w-[200px]">
            <Award className="w-8 h-8 text-blue-600 mx-auto mb-1 animate-bounce" />
            <span className="text-xs text-slate-500 font-bold uppercase block tracking-wider">Total XP</span>
            <span className="text-3xl font-black text-blue-700 block mt-1">{profileData.xp}</span>
          </div>

        </div>
      </div>

      {/* Grid of Stats & Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Stats Column */}
        <div className="lg:col-span-1 custom-card p-6 bg-white flex flex-col justify-between">
          <h2 className="text-lg font-extrabold text-slate-800 mb-6 border-b pb-2">Citizen Statistics</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-semibold text-slate-600">Issues Reported</span>
              </div>
              <span className="text-lg font-extrabold text-slate-800">{profileData.issuesReported}</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-600">Reports Verified</span>
              </div>
              <span className="text-lg font-extrabold text-slate-800">{profileData.issuesVerified}</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-slate-600">Comments Posted</span>
              </div>
              <span className="text-lg font-extrabold text-slate-800">{commentsPostedCount}</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-600">Current Level Tier</span>
              </div>
              <span className="text-sm font-bold text-slate-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">{profileData.level}</span>
            </div>
          </div>
        </div>

        {/* Badges Column */}
        <div className="lg:col-span-2 custom-card p-6 bg-white">
          <h2 className="text-lg font-extrabold text-slate-800 mb-6 border-b pb-2">Civic Badges Cabinet</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_POSSIBLE_BADGES.map((badgeDef, bIdx) => {
              const earnedBadge = profileData.badges.find(b => b.name === badgeDef.name);
              const isEarned = !!earnedBadge;

              return (
                <div
                  key={bIdx}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isEarned
                      ? 'bg-gradient-to-r from-emerald-50/40 to-white border-emerald-100 shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner shrink-0 ${
                    isEarned ? 'bg-emerald-100' : 'bg-slate-200 grayscale'
                  }`}>
                    {badgeDef.icon}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isEarned ? 'text-emerald-900' : 'text-slate-600'}`}>
                      {badgeDef.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{badgeDef.desc}</p>
                    {isEarned ? (
                      <span className="text-[9px] text-emerald-600 font-bold uppercase block mt-1">
                        Earned: {new Date(earnedBadge.earnedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold uppercase block mt-1">
                        Locked 🔒
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('issues')}
          className={`py-3.5 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'issues' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          My Reported Issues ({userIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`py-3.5 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Civic Ledger Log
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'issues' ? (
        userIssues.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <span className="text-4xl mb-2 block">🤷</span>
            <p className="text-slate-500 font-semibold mb-4">You haven't reported any issues yet.</p>
            <Link to="/report" className="btn btn-primary text-sm shadow-sm">Report Your First Issue</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userIssues.map(issue => {
              let statusColor = 'bg-red-50 text-red-700 border-red-100';
              if (issue.status === 'In Progress') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
              else if (issue.status === 'Resolved') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
              else if (issue.status === 'Closed') statusColor = 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <Link
                  key={issue._id}
                  to={`/issue/${issue._id}`}
                  className="custom-card flex flex-col justify-between overflow-hidden bg-white"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${statusColor}`}>
                        {issue.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 font-mono">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 mb-2 line-clamp-1">
                      {CATEGORY_EMOJIS[issue.category]} {issue.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{issue.description}</p>
                    
                    <p className="text-[10px] text-slate-400 font-medium truncate mb-2">📍 {issue.location.address}</p>
                  </div>
                  
                  <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold text-blue-600">👍 {issue.upvotes?.length || 0} supports</span>
                    <span className="font-semibold text-purple-600">💬 {issue.comments?.length || 0} comments</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        /* Chronological Ledger list */
        activities.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
            No activity history loaded yet. Actions will populate your timeline.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {activities.map((act, idx) => {
                let pillColor = 'bg-blue-50 text-blue-700';
                if (act.type === 'report') pillColor = 'bg-emerald-50 text-emerald-700';
                else if (act.type === 'resolve') pillColor = 'bg-purple-50 text-purple-700';

                return (
                  <div key={act.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-base">
                        {act.type === 'report' ? '📸' : act.type === 'verify' ? '✅' : act.type === 'resolve' ? '🎉' : act.type === 'upvote' ? '👍' : '💬'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-700 leading-none">{act.text}</p>
                        <span className="text-[10px] text-slate-400 block mt-1.5">{act.date.toLocaleDateString()} at {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-black px-2.5 py-1 rounded ${pillColor}`}>
                      {act.xp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

    </div>
  );
};
