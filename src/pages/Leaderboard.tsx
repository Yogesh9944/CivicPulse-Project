import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Award, Flame, Zap, Trophy, Shield, HelpCircle } from 'lucide-react';
import { useApp } from '../components/AppContext';

const LEVEL_COLORS: Record<string, string> = {
  Legend: '#F59E0B',
  Champion: '#7C3AED',
  Guardian: '#3B82F6',
  Citizen: '#6B7280'
};

const BADGE_EXPLAINERS = [
  { name: 'First Report', icon: '📸', desc: 'Log your first civic issue.' },
  { name: 'Community Watcher', icon: '👁️', desc: 'Secure 10 verified reports.' },
  { name: 'Legend Citizen', icon: '👑', desc: 'Achieve 1000+ total XP.' },
  { name: 'Team Player', icon: '🤝', desc: 'Post 20 or more comments.' }
];

export const Leaderboard: React.FC = () => {
  const { token, user: loggedInUser, showToast } = useApp();
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [praisingIds, setPraisingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/users/leaderboard')
      .then(r => r.json())
      .then(data => {
        setLeaders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching leaderboard:', err);
        setLoading(false);
      });
  }, []);

  const handlePraise = async (targetUserId: string) => {
    if (!token) {
      showToast('Please sign in to praise community guardians.', 'warning');
      return;
    }

    setPraisingIds(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await fetch(`/api/users/${targetUserId}/praise`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Sent Praise to ${data.targetUser.name}! +10 XP awarded to them. 👏`, 'success');
        
        // Update local list to show immediately incremented XP
        setLeaders(prev => prev.map(u => u._id === targetUserId ? { ...u, xp: u.xp + 10 } : u));
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to send praise.', 'danger');
      }
    } catch (e) {
      showToast('Error sending appreciation praise.', 'danger');
    } finally {
      setPraisingIds(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-slate-500 mt-4 font-semibold text-sm">Compiling civic leader stats...</p>
      </div>
    );
  }

  // Extract Podium Users
  const podium1 = leaders[0] || null;
  const podium2 = leaders[1] || null;
  const podium3 = leaders[2] || null;

  // Remaining users
  const tableUsers = leaders.slice(3);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getBadgeIcon = (level: string) => {
    switch (level) {
      case 'Legend': return '👑';
      case 'Champion': return '🏆';
      case 'Guardian': return '🛡️';
      default: return '🔰';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="leaderboard-page">
      
      {/* Page Title */}
      <div className="text-center mb-10">
        <span className="text-4xl mb-2 inline-block">🏆</span>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Civic Leaderboard</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">Honoring active citizens driving real neighborhood improvements across Mumbai.</p>
      </div>

      {/* Podium Showcase (Top 3) */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-12 max-w-3xl mx-auto px-4">
        
        {/* 2nd Place Podium */}
        {podium2 && (
          <div className="flex flex-col items-center w-full md:w-48 order-2 md:order-1 mt-6">
            <div className="relative mb-3 flex flex-col items-center">
              <span className="text-2xl mb-1">🥈</span>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md ring-4 ring-slate-300" style={{ backgroundColor: LEVEL_COLORS[podium2.level] || '#3B82F6' }}>
                {getInitials(podium2.name)}
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-700 text-center truncate w-full">{podium2.name}</h3>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{getBadgeIcon(podium2.level)} {podium2.level}</span>
            <div className="w-full bg-slate-100 border border-slate-200 rounded-t-xl h-24 flex flex-col items-center justify-center p-3 mt-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">2nd Place</span>
              <span className="text-lg font-black text-slate-700 mt-1">{podium2.xp} XP</span>
            </div>
          </div>
        )}

        {/* 1st Place Podium */}
        {podium1 && (
          <div className="flex flex-col items-center w-full md:w-56 order-1 md:order-2">
            <div className="relative mb-3 flex flex-col items-center">
              <span className="text-3xl mb-1 animate-bounce">🥇</span>
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xl ring-4 ring-amber-400" style={{ backgroundColor: LEVEL_COLORS[podium1.level] || '#F59E0B' }}>
                {getInitials(podium1.name)}
              </div>
            </div>
            <h3 className="text-base font-extrabold text-slate-800 text-center truncate w-full">{podium1.name}</h3>
            <span className="text-[11px] font-bold text-amber-600 mt-0.5">{getBadgeIcon(podium1.level)} {podium1.level}</span>
            <div className="w-full bg-amber-50 border-x border-t border-amber-200 rounded-t-xl h-32 flex flex-col items-center justify-center p-4 mt-4 shadow-md">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Community Champion</span>
              <span className="text-2xl font-black text-amber-600 mt-1">{podium1.xp} XP</span>
            </div>
          </div>
        )}

        {/* 3rd Place Podium */}
        {podium3 && (
          <div className="flex flex-col items-center w-full md:w-48 order-3 md:order-3 mt-8">
            <div className="relative mb-3 flex flex-col items-center">
              <span className="text-2xl mb-1">🥉</span>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-md ring-4 ring-amber-700/20" style={{ backgroundColor: LEVEL_COLORS[podium3.level] || '#3B82F6' }}>
                {getInitials(podium3.name)}
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-700 text-center truncate w-full">{podium3.name}</h3>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{getBadgeIcon(podium3.level)} {podium3.level}</span>
            <div className="w-full bg-slate-100/50 border border-slate-200 rounded-t-xl h-20 flex flex-col items-center justify-center p-3 mt-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">3rd Place</span>
              <span className="text-base font-black text-slate-600 mt-1">{podium3.xp} XP</span>
            </div>
          </div>
        )}

      </div>

      {/* Main Grid: Leaders Table & XP Rules Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Leaders Table */}
        <div className="lg:col-span-2 custom-card bg-white p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">All Active Rankings</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Citizen Name</th>
                  <th className="py-3 px-4">Tier Badge</th>
                  <th className="py-3 px-4 text-right">XP</th>
                  <th className="py-3 px-4 text-center">Reports</th>
                  <th className="py-3 px-4 text-center">Badges</th>
                  <th className="py-3 px-4 text-center">Appreciate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaders.map((user, index) => {
                  const rank = index + 1;
                  let rankCell = <span className="font-bold text-slate-700">#{rank}</span>;
                  if (rank === 1) rankCell = <span className="text-lg">🥇</span>;
                  else if (rank === 2) rankCell = <span className="text-lg">🥈</span>;
                  else if (rank === 3) rankCell = <span className="text-lg">🥉</span>;

                  return (
                    <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-500">{rankCell}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: LEVEL_COLORS[user.level] || '#6B7280' }}>
                            {getInitials(user.name)}
                          </div>
                          <span className="font-bold text-slate-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          user.level === 'Legend' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          user.level === 'Champion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          user.level === 'Guardian' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {getBadgeIcon(user.level)} {user.level}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-black font-mono text-blue-600">{user.xp}</td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-700">{user.issuesReported || 0}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {user.badges && user.badges.length > 0 ? (
                            user.badges.map((b, idx) => (
                              <span key={idx} className="text-base cursor-help" title={b.name}>{b.icon}</span>
                            ))
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {loggedInUser && loggedInUser._id !== user._id ? (
                          <button
                            disabled={praisingIds[user._id]}
                            onClick={() => handlePraise(user._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <span>👏</span>
                            <span>{praisingIds[user._id] ? 'Praising...' : 'Praise'}</span>
                          </button>
                        ) : loggedInUser && loggedInUser._id === user._id ? (
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">You ⭐️</span>
                        ) : (
                          <button
                            onClick={() => showToast('Please sign in to praise community guardians.', 'warning')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <span>👏</span>
                            <span>Praise</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* XP Rules */}
          <div className="custom-card p-6 bg-white">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
              Citizen XP Rules
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">Every civic contribution helps improve Mumbai. Work together and level up!</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-600">Report an Issue</span>
                <span className="font-bold text-emerald-600 font-mono">+50 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-600">Report Verified (5+ votes)</span>
                <span className="font-bold text-emerald-600 font-mono">+25 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-600">Upvote neighbors report</span>
                <span className="font-bold text-emerald-600 font-mono">+5 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-600">Add constructive comment</span>
                <span className="font-bold text-emerald-600 font-mono">+10 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                <span>Issue Marked Resolved 🎉</span>
                <span className="font-mono text-emerald-600">+100 XP</span>
              </div>
            </div>
          </div>

          {/* Badges Cabinet Guide */}
          <div className="custom-card p-6 bg-white">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-500" />
              Badge Unlock Guide
            </h3>
            
            <div className="space-y-4">
              {BADGE_EXPLAINERS.map((badge, idx) => (
                <div key={idx} className="flex gap-3 items-start text-xs">
                  <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center text-lg shrink-0">
                    {badge.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700">{badge.name}</h4>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
