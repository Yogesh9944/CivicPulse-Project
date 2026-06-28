import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Camera, Brain, Users, Sparkles } from 'lucide-react';
import { Issue, DashboardStats } from '../types';
import { useApp } from '../components/AppContext';

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

export const Landing: React.FC = () => {
  const { t } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [latestIssues, setLatestIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Stats & Latest Issues
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/issues?sort=newest').then(r => r.json())
    ])
      .then(([statsData, issuesData]) => {
        setStats(statsData);
        // Take latest 5 open/in progress issues for the ticker
        const openIssues = issuesData.filter((i: Issue) => i.status === 'Open' || i.status === 'In Progress').slice(0, 5);
        setLatestIssues(openIssues);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching landing data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#1e3a5f] to-[#2563EB]" id="hero-section">
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-4.5 h-4.5 text-amber-300" />
            {t('AI-Powered Hyperlocal Civic Resolution')}
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-3xl">
            {t('Fix Your City, ')} <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-300">{t('One Report at a Time')}</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl leading-relaxed">
            {t('CivicPulse lets you snap a photo of any street issue, uses Google Gemini AI to analyze it instantly, and coordinates community support to get it fixed fast.')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
            <Link to="/report" className="btn btn-success text-base font-bold shadow-lg px-8 py-4 bg-emerald-500 hover:bg-emerald-600">
              {t('Report an Issue')}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/feed?view=map" className="btn btn-outline text-base font-bold text-white border-white/40 hover:bg-white/10 hover:border-white px-8 py-4">
              {t('View Live Map')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Counter Row */}
      <section className="relative z-10 -mt-10 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Total Issues */}
          <div className="custom-card p-6 bg-white flex flex-col items-center text-center shadow-lg hover:translate-y-[-4px]" id="stat-card-total">
            <span className="text-3xl mb-2">📋</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Total Issues')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {loading ? <span className="skeleton-pulse inline-block w-16 h-8 rounded" /> : (stats?.totalIssues || 0)}
            </span>
          </div>

          {/* Resolved */}
          <div className="custom-card p-6 bg-white flex flex-col items-center text-center shadow-lg hover:translate-y-[-4px]" id="stat-card-resolved">
            <span className="text-3xl mb-2">✅</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Issues Resolved')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
              {loading ? <span className="skeleton-pulse inline-block w-16 h-8 rounded" /> : (stats?.resolvedIssues || 0)}
            </span>
          </div>

          {/* Active Citizens */}
          <div className="custom-card p-6 bg-white flex flex-col items-center text-center shadow-lg hover:translate-y-[-4px]" id="stat-card-citizens">
            <span className="text-3xl mb-2">👥</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Active Citizens')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">
              {loading ? <span className="skeleton-pulse inline-block w-16 h-8 rounded" /> : (stats?.activeUsers || 0)}
            </span>
          </div>

          {/* Avg Resolution Days */}
          <div className="custom-card p-6 bg-white flex flex-col items-center text-center shadow-lg hover:translate-y-[-4px]" id="stat-card-speed">
            <span className="text-3xl mb-2">⏱️</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Avg Resolution')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-1">
              {loading ? <span className="skeleton-pulse inline-block w-16 h-8 rounded" /> : `${stats?.avgResolutionTime || 2.4} ${t('Days')}`}
            </span>
          </div>

        </div>
      </section>

      {/* Horizontally Scrolling Issue Ticker */}
      {latestIssues.length > 0 && (
        <section className="bg-slate-900 text-white py-4 mt-12 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
            <span className="text-xs font-extrabold uppercase tracking-wider bg-red-500 text-white px-2 py-1 rounded shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              {t('Live Alerts:')}
            </span>
            <div className="ticker-wrap flex-1">
              <div className="ticker-content flex items-center">
                {/* Double output for continuous loop feel */}
                {[...latestIssues, ...latestIssues].map((issue, idx) => (
                  <Link to={`/issue/${issue._id}`} key={idx} className="flex items-center gap-2 hover:text-blue-400 transition-colors shrink-0 mx-4">
                    <span className="text-sm">{CATEGORY_EMOJIS[issue.category] || '📍'}</span>
                    <span className="text-xs font-bold uppercase text-slate-400">[{t(issue.category)}]</span>
                    <span className="text-xs font-semibold text-white">{issue.title}</span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">Mumbai</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full" id="how-it-works">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('How CivicPulse Works')}</h2>
          <p className="text-slate-500 mt-2 text-base max-w-xl mx-auto">{t('Four simple steps to transform your neighborhood from your smartphone.')}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <span className="absolute top-4 right-4 text-slate-200 text-3xl font-black">01</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('1) 📸 Snap Photo')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('Take a picture of a pothole, blacked-out street light, or garbage pile directly on location.')}
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-inner">
              <Brain className="w-6 h-6" />
            </div>
            <span className="absolute top-4 right-4 text-slate-200 text-3xl font-black">02</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('2) 🤖 AI Analyzes')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('Google Gemini identifies the issue category, gauges severity, and generates an automated draft instantly.')}
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <span className="absolute top-4 right-4 text-slate-200 text-3xl font-black">03</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('3) 👥 Community Verifies')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('Nearby citizens support with upvotes. 5+ upvotes automatically verify the issue as a priority.')}
            </p>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-inner">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="absolute top-4 right-4 text-slate-200 text-3xl font-black">04</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('4) ✅ Issue Resolved')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('Updates go out to municipal channels. Watch the timeline update in real-time until resolution!')}
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <span className="text-white font-bold tracking-tight">{t('CivicPulse – Community Hero')}</span>
          </div>
          <p className="text-xs text-slate-500">{t('Built for communities, powered by AI • Mumbai Area Civic Coordination Hub')}</p>
          <div className="flex gap-4 text-xs font-semibold text-slate-400">
            <Link to="/feed" className="hover:text-white transition-colors">{t('Browse Feed')}</Link>
            <Link to="/leaderboard" className="hover:text-white transition-colors">{t('Civic Leaders')}</Link>
            <Link to="/authority" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-bold">
              <span>🏛️</span>
              <span>{t('Official Portal')}</span>
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};
