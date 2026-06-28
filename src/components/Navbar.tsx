import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from './AppContext';
import { Menu, X, Bell, PlusCircle, LogOut, Award, User as UserIcon, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, unreadNotifCount, notifications, refreshNotifications, language, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Level Styling Helpers
  const getLevelColors = (level: string) => {
    switch (level) {
      case 'Legend':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-300', fill: '#F59E0B', text: 'text-amber-600', ring: 'ring-amber-400' };
      case 'Champion':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-300', fill: '#7C3AED', text: 'text-purple-600', ring: 'ring-purple-400' };
      case 'Guardian':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-300', fill: '#3B82F6', text: 'text-blue-600', ring: 'ring-blue-400' };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-300', fill: '#6B7280', text: 'text-slate-600', ring: 'ring-slate-300' };
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Legend': return '👑 Legend';
      case 'Champion': return '🏆 Champion';
      case 'Guardian': return '🛡️ Guardian';
      default: return '🔰 Citizen';
    }
  };

  // Calculate XP threshold progress bar
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
      return { percentage: 100, label: `${xp} XP` };
    }

    const percentage = Math.min(100, Math.max(0, ((xp - minXp) / (maxXp - minXp)) * 100));
    return { percentage, label: `${xp} / ${maxXp} XP` };
  };

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '';
  const levelStyle = user ? getLevelColors(user.level) : getLevelColors('Citizen');
  const xpProg = user ? getXpProgress(user.xp, user.level) : { percentage: 0, label: '0 XP' };

  const handleBellClick = () => {
    setBellDropdownOpen(!bellDropdownOpen);
    if (!bellDropdownOpen) {
      refreshNotifications();
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2" id="logo-link">
              <span className="text-3xl leading-none">🏛️</span>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-none">CivicPulse</span>
                <span className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase block mt-0.5">{t('Fix Your City')}</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 ml-6 mr-auto">
            <Link to="/" className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}`}>{t('Home')}</Link>
            <Link to="/feed" className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive('/feed') ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}`}>{t('Feed')}</Link>
            <Link to="/feed?view=map" className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive('/feed?view=map') ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}`}>{t('Live Map')}</Link>
            <Link to="/dashboard" className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive('/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}`}>{t('Dashboard')}</Link>
            <Link to="/leaderboard" className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive('/leaderboard') ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}`}>{t('Leaderboard')}</Link>
          </div>

          {/* Right Area (Desktop Auth & Actions) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer select-none shrink-0"
              title={language === 'en' ? 'हिन्दी में बदलें' : 'Change to English'}
              id="lang-toggle-desktop"
            >
              <span className="text-sm">🌐</span>
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={handleBellClick}
                    className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors relative cursor-pointer"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {bellDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-scale-up">
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Recent Updates</span>
                        <span className="text-[10px] text-blue-600 font-semibold uppercase">{unreadNotifCount} unread</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            No notifications yet!
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div key={notif._id} className={`px-4 py-3 border-b border-slate-50 text-xs transition-colors hover:bg-slate-50 ${!notif.isRead ? 'bg-blue-50/50' : ''}`}>
                              <p className="text-slate-700 font-medium leading-relaxed">{notif.text}</p>
                              <span className="text-[9px] text-slate-400 block mt-1">
                                {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info with Level Progress */}
                <div className="flex flex-col items-end min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-800 leading-none">{user.name}</span>
                      <span className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.2 rounded-full border ${levelStyle.bg} leading-none`}>
                        {getLevelBadge(user.level)}
                      </span>
                    </div>

                    {/* Colored Avatar */}
                    <Link to="/profile" className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-offset-1 ${levelStyle.ring}`} style={{ backgroundColor: levelStyle.fill }}>
                      {initials}
                    </Link>
                  </div>

                  {/* XP Progress Slider */}
                  <div className="w-full mt-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpProg.percentage}%`, backgroundColor: levelStyle.fill }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono block text-right mt-0.5">{xpProg.label}</span>
                  </div>
                </div>

                {/* Report Issue Button */}
                <Link to="/report" className="btn btn-success px-4 py-2 text-sm flex items-center gap-1.5 shadow-sm">
                  <PlusCircle className="w-4 h-4" />
                  {t('Report Issue')}
                </Link>

                {/* Logout Button */}
                <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 transition-colors cursor-pointer" title={t('Logout')}>
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">{t('Login')}</Link>
                <Link to="/register" className="btn btn-primary px-4 py-2 text-sm shadow-sm">{t('Register')}</Link>
              </div>
            )}
          </div>

          {/* Hamburger Menu Icon (Mobile) */}
          <div className="flex items-center md:hidden">
            {/* Language Toggle Button (Mobile) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer mr-2 select-none shrink-0"
              id="lang-toggle-mobile"
            >
              <span>🌐</span>
              <span>{language === 'en' ? 'हिन्दी' : 'En'}</span>
            </button>

            {user && (
              <button
                onClick={handleBellClick}
                className="p-2 text-slate-500 hover:text-blue-600 rounded-full relative mr-2 cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-in Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 py-3 px-4 shadow-inner animate-scale-up">
          <div className="flex flex-col space-y-2">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-md text-base font-semibold ${isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{t('Home')}</Link>
            <Link to="/feed" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-md text-base font-semibold ${isActive('/feed') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{t('Feed')}</Link>
            <Link to="/feed?view=map" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-md text-base font-semibold ${isActive('/feed?view=map') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{t('Live Map')}</Link>
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-md text-base font-semibold ${isActive('/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{t('Dashboard')}</Link>
            <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-md text-base font-semibold ${isActive('/leaderboard') ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{t('Leaderboard')}</Link>
            
            {user ? (
              <div className="pt-4 border-t border-slate-100 flex flex-col space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white`} style={{ backgroundColor: levelStyle.fill }}>
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-none">{user.name}</h4>
                    <span className="text-xs text-slate-500 mt-1 block font-medium">{t(getLevelBadge(user.level))} • {user.xp} XP</span>
                  </div>
                </div>
                
                <div className="w-full">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border">
                    <div className="h-full rounded-full transition-all" style={{ width: `${xpProg.percentage}%`, backgroundColor: levelStyle.fill }} />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right mt-1 font-mono">{xpProg.label}</span>
                </div>

                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline py-2 text-sm flex items-center justify-center gap-2">
                  <UserIcon className="w-4 h-4" /> {t('My Profile')}
                </Link>

                <Link to="/report" onClick={() => setMobileMenuOpen(false)} className="btn btn-success py-2 text-sm flex items-center justify-center gap-2 shadow-sm">
                  <PlusCircle className="w-4 h-4" /> {t('Report Issue')}
                </Link>
                
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn btn-outline py-2 text-sm border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-2 cursor-pointer">
                  <LogOut className="w-4 h-4" /> {t('Logout')}
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline py-2 text-center text-sm">{t('Login')}</Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary py-2 text-center text-sm">{t('Register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
