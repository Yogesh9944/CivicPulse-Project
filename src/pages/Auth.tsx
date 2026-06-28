import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';

export const Auth: React.FC<{ initialMode: 'login' | 'register' | 'official' }> = ({ initialMode }) => {
  const { login, showToast, t } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/feed';

  const [mode, setMode] = useState<'login' | 'register' | 'official'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'register' && !name)) {
      showToast(t('Please fill out all required fields.'), 'warning');
      return;
    }

    setLoading(true);
    const endpoint = mode === 'official' ? '/api/authority/login' : (mode === 'login' ? '/api/auth/login' : '/api/auth/register');
    const body = mode === 'register' ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t('Authentication failed. Please try again.'), 'danger');
        setLoading(false);
        return;
      }

      if (mode === 'official') {
        localStorage.setItem('authority_token', data.token);
        localStorage.setItem('authority_officer', data.user.name);
        localStorage.setItem('authority_role', data.user.role || 'Municipal Officer');
        localStorage.setItem('authority_dept', data.user.department || '');
        showToast(`${t('Welcome back, Officer')} ${data.user.name}! 🏛️`, 'success');
        navigate('/authority');
        return;
      }

      // Success
      login(data.token, data.user);
      
      // Redirect
      if (mode === 'register') {
        showToast(t('Registration successful! Earn XP by reporting community issues. 🎉'), 'success');
        navigate('/report');
      } else {
        navigate(redirectTo);
      }
    } catch (err) {
      console.error('Auth error:', err);
      showToast(t('Server connection failed. Please check your connection.'), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden" id="auth-page">
      {/* Decorative vector meshes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-scale-up relative z-10 p-8">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <span className="text-4xl mb-2">{mode === 'official' ? '🏛️' : '🏙️'}</span>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">CivicPulse</h2>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">
            {mode === 'official' ? t('Official Authority Portal') : t('Fix Your City • Community Hero')}
          </p>
        </div>

        {/* Tab Toggle buttons */}
        <div className="grid grid-cols-3 bg-slate-100 p-1.5 rounded-xl mb-6">
          <button
            onClick={() => { setMode('login'); setEmail(''); setPassword(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t('Login')}
          </button>
          <button
            onClick={() => { setMode('register'); setEmail(''); setPassword(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t('Register')}
          </button>
          <button
            onClick={() => { setMode('official'); setEmail('admin@civicpulse.in'); setPassword('admin123'); }}
            className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === 'official' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🏛️ {t('Official')}
          </button>
        </div>

        {/* Description Label */}
        <p className="text-center text-sm text-slate-500 mb-6 font-medium">
          {mode === 'login' && t('Sign in to log issues, upvote neighbors, and track repairs.')}
          {mode === 'register' && t('Create an account to become a community guardian and earn civic XP!')}
          {mode === 'official' && t('Official municipal hub for high-command oversight and worker deployment.')}
        </p>

        {/* Demo Credentials Info Box for Official Mode */}
        {mode === 'official' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
            <p className="font-bold mb-1">🏛️ {t('Demo Credentials:')}</p>
            <div className="font-mono">
              <div>{t('Official Email')}: <span className="font-bold">admin@civicpulse.in</span></div>
              <div>{t('Secret Access Password')}: <span className="font-bold">admin123</span></div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1">{t('Your Full Name')}</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400"><UserIcon className="w-4 h-4" /></span>
                <input
                  type="text"
                  required
                  placeholder="Ramesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="custom-input w-full !pl-11"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">
              {mode === 'official' ? t('Official Email') : t('Email Address')}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400"><Mail className="w-4 h-4" /></span>
              <input
                type="email"
                required
                placeholder={mode === 'official' ? 'admin@civicpulse.in' : 'citizen@example.com'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="custom-input w-full !pl-11"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">
              {mode === 'official' ? t('Secret Access Password') : t('Password')}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400"><Lock className="w-4 h-4" /></span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="custom-input w-full !pl-11"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn w-full py-3.5 mt-2 flex items-center justify-center font-bold text-white shadow-md rounded-xl transition-all cursor-pointer ${
              mode === 'official' ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('Processing...')}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {mode === 'official' ? t('Sign In to Admin Hub') : (mode === 'login' ? t('Sign In') : t('Create Account'))}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Legal Disclaimer copy */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-center text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{mode === 'official' ? t('Authorized Municipal Personnel Only') : t('By joining, you agree to help fix your community 🏙️')}</span>
        </div>

      </div>
    </div>
  );
};
