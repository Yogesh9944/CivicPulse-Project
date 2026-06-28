import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, AlertTriangle, CheckCircle, Clock, Eye, Send, ArrowRight, ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { Issue } from '../types';
import { useApp } from '../components/AppContext';

// Helper to determine department based on category
export function getDepartmentForCategory(category: string): string {
  if (category === 'Pothole' || category === 'Road Damage') return 'Public Works Department (PWD)';
  if (category === 'Street Light') return 'Electricity Board';
  if (category === 'Garbage') return 'Sanitation Department';
  if (category === 'Water Leakage') return 'Water & Sewage Board';
  if (category === 'Encroachment') return 'Urban Planning & Encroachment';
  if (category === 'Noise Pollution') return 'Pollution Control Board';
  return 'General Administration';
}

const DEPARTMENTS = [
  'Public Works Department (PWD)',
  'Electricity Board',
  'Sanitation Department',
  'Water & Sewage Board',
  'Urban Planning & Encroachment',
  'Pollution Control Board',
  'General Administration'
];

const DEPT_ICONS: Record<string, string> = {
  'Public Works Department (PWD)': '🚧',
  'Electricity Board': '💡',
  'Sanitation Department': '🗑️',
  'Water & Sewage Board': '💧',
  'Urban Planning & Encroachment': '🏗️',
  'Pollution Control Board': '🔊',
  'General Administration': '🏛️'
};

const DEPT_COLORS: Record<string, string> = {
  'Public Works Department (PWD)': 'from-amber-500 to-orange-600',
  'Electricity Board': 'from-yellow-400 to-amber-500',
  'Sanitation Department': 'from-teal-500 to-emerald-600',
  'Water & Sewage Board': 'from-blue-500 to-indigo-600',
  'Urban Planning & Encroachment': 'from-purple-500 to-pink-600',
  'Pollution Control Board': 'from-rose-500 to-red-600',
  'General Administration': 'from-slate-500 to-slate-700'
};

const JUNIOR_WORKERS_BY_DEPT: Record<string, string[]> = {
  'Public Works Department (PWD)': ['Junior Engineer Amit Sharma', 'Site Inspector Rohan Joshi', 'Lead Repair Mason Sunil Gavaskar'],
  'Electricity Board': ['Line Engineer Devendra Phadnis', 'Grid Operator Prakash Kadam'],
  'Sanitation Department': ['Sewer Supervisor Harish Sawant', 'Waste Manager Dipak Patil'],
  'Water & Sewage Board': ['Hydraulics Engineer Vivek Patil', 'Pipeline Inspector Ajay Desai'],
  'Urban Planning & Encroachment': ['Zoning Officer Manoj Shinde', 'Demolition Marshal Raj Thackeray'],
  'Pollution Control Board': ['Acoustic Engineer Nilesh Rane', 'Air Quality Inspector Sachin Tendulkar'],
  'General Administration': ['Junior Officer Anand Mahindra', 'Staff Secretary Kiran Bedi']
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

// Simulated resolved photos from Unsplash to ensure awesome demo fidelity
const MOCK_RESOLVED_PHOTOS: Record<string, string> = {
  'Public Works Department (PWD)': 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600', // clean asphalt
  'Electricity Board': 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&q=80&w=600', // illuminated bright street lamp
  'Sanitation Department': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600', // tidy garbage bins / clean sidewalk
  'Water & Sewage Board': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600', // clear clean water / stream
  'Urban Planning & Encroachment': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600', // tidy building pavement
  'Pollution Control Board': 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=600', // quiet green park
  'General Administration': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600'
};

export const AuthorityPortal: React.FC = () => {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [officerName, setOfficerName] = useState('');
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selected Issue for Resolution Panel
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'In Progress' | 'Resolved'>('In Progress');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedImageBase64, setResolvedImageBase64] = useState('');
  const [assignedWorker, setAssignedWorker] = useState('');
  const [officialCommands, setOfficialCommands] = useState('');
  const [slaDeadline, setSlaDeadline] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<{
    reporterXpReward: number;
    reporterLeveledUp: boolean;
    officialResponse: string;
  } | null>(null);

  useEffect(() => {
    // Check if official is already logged in
    const token = localStorage.getItem('authority_token');
    const storedOfficer = localStorage.getItem('authority_officer');
    if (token && storedOfficer) {
      setIsLoggedIn(true);
      setOfficerName(storedOfficer);
      fetchIssues();
    }
  }, []);

  const fetchIssues = () => {
    setLoading(true);
    fetch('/api/authority/issues')
      .then(res => res.json())
      .then((data: Issue[]) => {
        setIssues(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching authority issues:', err);
        setLoading(false);
      });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    fetch('/api/authority/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(r => {
        if (!r.ok) {
          throw new Error('Authentication failed. Check your credentials.');
        }
        return r.json();
      })
      .then(data => {
        localStorage.setItem('authority_token', data.token);
        localStorage.setItem('authority_officer', data.user.name);
        setIsLoggedIn(true);
        setOfficerName(data.user.name);
        fetchIssues();
      })
      .catch(err => {
        setError(err.message || 'Invalid username or password.');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('authority_token');
    localStorage.removeItem('authority_officer');
    setIsLoggedIn(false);
    setSelectedIssue(null);
  };

  // Image upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolvedImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Demo simulate photo populates high fidelity repaired image
  const handleSimulatePhoto = () => {
    const simulatedUrl = MOCK_RESOLVED_PHOTOS[activeDept] || MOCK_RESOLVED_PHOTOS['General Administration'];
    setResolvedImageBase64(simulatedUrl);
  };

  // Submit status update
  const handleSubmitResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setSubmittingResolution(true);
    setResolutionResult(null);

    fetch(`/api/authority/issues/${selectedIssue._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: resolutionStatus,
        note: resolutionNote || undefined,
        resolvedImage: resolvedImageBase64 || undefined,
        assignedWorker: assignedWorker || undefined,
        officialCommands: officialCommands || undefined,
        slaDeadline: slaDeadline ? new Date(slaDeadline).toISOString() : undefined
      })
    })
      .then(res => res.json())
      .then(data => {
        setResolutionResult({
          reporterXpReward: data.reporterXpReward,
          reporterLeveledUp: data.reporterLeveledUp,
          officialResponse: data.officialResponse
        });
        
        // Refresh local issue details
        setSelectedIssue(data.issue);
        
        // Refresh full lists
        fetchIssues();
        setSubmittingResolution(false);
      })
      .catch(err => {
        console.error('Error updating issue resolution:', err);
        setSubmittingResolution(false);
      });
  };

  // Filter issues assigned to currently selected department
  const deptIssues = issues.filter(i => getDepartmentForCategory(i.category) === activeDept);
  
  // Department performance metric aggregates
  const totalDeptCount = deptIssues.length;
  const resolvedDeptCount = deptIssues.filter(i => i.status === 'Resolved').length;
  const activeDeptCount = deptIssues.filter(i => i.status === 'Open' || i.status === 'In Progress').length;
  const slaMetPercentage = totalDeptCount > 0 ? Math.round((resolvedDeptCount / totalDeptCount) * 100) : 100;
  
  // Severity distribution
  const highSeverityCount = deptIssues.filter(i => i.severity === 'High' || i.severity === 'Critical').length;

  return (
    <div className="w-full min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      
      {!isLoggedIn ? (
        /* Authority Portal Auth Form Screen */
        <div className="max-w-md mx-auto mt-16">
          <div className="text-center mb-8">
            <span className="text-5xl leading-none block mb-3 animate-bounce">🏛️</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('CivicPulse Authority Portal')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('Official Municipal Administration Dashboard')}</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg border border-blue-100 mb-6">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{t('Demo Credentials:')} <strong className="underline">admin@civicpulse.in</strong> / <strong className="underline">admin123</strong></span>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-800 text-xs font-semibold p-3 rounded-lg border border-rose-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('Official Email')}</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., admin@civicpulse.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('Secret Access Password')}</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary py-3 font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
              >
                <span>{t('Sign In to Admin Hub')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Main Authority Dashboard View */
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white rounded-2xl p-6 shadow-lg gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <span className="bg-blue-500 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest">{t('Municipal Officer')}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">{t('CivicPulse Resolution Center')}</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {t('Logged in as:')} <strong className="text-emerald-400 font-extrabold">{officerName}</strong> • {t('Mumbai Central Command')}
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={fetchIssues}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
                title={t('Sync database')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer select-none"
              >
                {t('Exit Hub')}
              </button>
            </div>
          </div>

          {/* Department Selection Strip */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mr-2">{t('Select Assigned Department:')}</span>
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((dept, idx) => {
                const isActive = activeDept === dept;
                const emoji = DEPT_ICONS[dept] || '📍';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveDept(dept);
                      setSelectedIssue(null);
                      setResolutionResult(null);
                      setResolutionNote('');
                      setResolvedImageBase64('');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{t(dept)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Department Performance metrics & statistics */}
            <div className="space-y-6">
              
              {/* Department Overview and SLA met */}
              <div className="custom-card p-6 bg-white flex flex-col items-center justify-center text-center">
                <span className="text-4xl p-3 bg-slate-50 rounded-full mb-3 shadow-inner">
                  {DEPT_ICONS[activeDept] || '🏢'}
                </span>
                <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-tight">{t(activeDept)}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">DEPARTMENT PROFILE & PERFORMANCE</p>

                {/* Custom SVG Circular SLA Gauge */}
                <div className="relative w-36 h-36 mt-6 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="54"
                      className="stroke-slate-100"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="54"
                      className="stroke-blue-600 transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - slaMetPercentage / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-black text-slate-800">{slaMetPercentage}%</span>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">{t('SLA Met')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full mt-6 border-t border-slate-100 pt-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-400 block uppercase">{t('Assigned')}</span>
                    <span className="text-lg font-extrabold text-slate-800">{totalDeptCount}</span>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <span className="text-xs font-bold text-slate-400 block uppercase">{t('Pending')}</span>
                    <span className="text-lg font-extrabold text-amber-500">{activeDeptCount}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-400 block uppercase">{t('Resolved')}</span>
                    <span className="text-lg font-extrabold text-emerald-600">{resolvedDeptCount}</span>
                  </div>
                </div>
              </div>

              {/* Department Workload Status SVG Bar Chart */}
              <div className="custom-card p-6 bg-white">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">{t('Weekly Case Workload')}</h4>
                
                <div className="space-y-4">
                  {/* Status Bar: Open */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-600 mb-1">
                      <span>🔴 Open / Unassigned</span>
                      <span>{deptIssues.filter(i => i.status === 'Open').length}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${totalDeptCount > 0 ? (deptIssues.filter(i => i.status === 'Open').length / totalDeptCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Bar: In Progress */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-600 mb-1">
                      <span>🟡 In Progress Repair</span>
                      <span>{deptIssues.filter(i => i.status === 'In Progress').length}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${totalDeptCount > 0 ? (deptIssues.filter(i => i.status === 'In Progress').length / totalDeptCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Bar: Resolved */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-600 mb-1">
                      <span>🟢 Successfully Resolved</span>
                      <span>{resolvedDeptCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${totalDeptCount > 0 ? (resolvedDeptCount / totalDeptCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-6 flex items-center gap-2.5 text-xs text-slate-600">
                  <span className="text-lg">⚡</span>
                  <div>
                    <span className="font-extrabold block text-slate-800">{highSeverityCount} {t('Critical cases pending')}</span>
                    <span>High priority items must be investigated within 12 hours.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right/Middle columns: List of assigned issues and active resolution form */}
            <div className="lg:col-span-2 space-y-6">
              
              {selectedIssue ? (
                /* Resolution Action Workspace Pane */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-scale-up">
                  
                  {/* Workspace Header */}
                  <div className={`p-4 bg-gradient-to-r ${DEPT_COLORS[activeDept]} text-white flex justify-between items-center`}>
                    <button
                      onClick={() => {
                        setSelectedIssue(null);
                        setResolutionResult(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-extrabold bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('Back to List')}</span>
                    </button>
                    <span className="text-xs font-bold tracking-widest uppercase">{t('Resolution Workspace')}</span>
                  </div>

                  <div className="p-6 space-y-6">
                    
                    {/* Compact Complaint Dossier */}
                    <div className="flex gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {selectedIssue.images && selectedIssue.images[0] ? (
                        <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-300">
                          <img src={selectedIssue.images[0]} alt="Citizen Upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-slate-200 shrink-0 border border-slate-300 flex items-center justify-center text-3xl">
                          📍
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            {t(selectedIssue.severity)}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            selectedIssue.status === 'Resolved' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : selectedIssue.status === 'In Progress' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {t(selectedIssue.status)}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800 truncate">{selectedIssue.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{selectedIssue.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                          <span>📍</span>
                          <span className="truncate">{selectedIssue.location.address}</span>
                        </p>
                      </div>
                    </div>

                    {/* Current Delegation Status Block */}
                    {selectedIssue.assignedWorker && (
                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                            🏛️ {t('Current Delegation Directive')}
                          </span>
                          <h4 className="text-xs font-extrabold text-slate-800">
                            {t('Assigned Worker')}: <span className="text-blue-700 font-mono font-bold">{selectedIssue.assignedWorker}</span>
                          </h4>
                          <p className="text-xs text-slate-600 font-medium italic">
                            " {selectedIssue.officialCommands || t('No special commands logged.')} "
                          </p>
                        </div>
                        {selectedIssue.slaDeadline && (
                          <div className="bg-white border border-blue-100 p-2 rounded-lg text-center shrink-0">
                            <span className="text-[9px] text-slate-400 font-extrabold block uppercase">{t('SLA Target')}</span>
                            <span className="text-xs font-extrabold text-rose-600 font-mono">
                              {new Date(selectedIssue.slaDeadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gemini Response Showcase Alert (if already generated) */}
                    {resolutionResult ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-800">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                              <span className="font-extrabold text-sm">{t('Issue Successfully Updated!')}</span>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black font-mono">
                              +{resolutionResult.reporterXpReward} XP Dispatched
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {t('The citizen has been rewarded with points. Their notification panel and live dashboard have been synchronized instantly.')}
                          </p>
                        </div>

                        {/* Gemini Response Block */}
                        <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-inner">
                          {/* AI Badge Overlay */}
                          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>GEMINI AUTO-DRAFT</span>
                          </div>
                          
                          <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">{t('Auto-Drafted Message Dispatched to Citizen')}</h4>
                          <div className="text-xs text-slate-700 leading-relaxed font-semibold italic bg-white/60 p-3.5 rounded-lg border border-indigo-100 mt-2">
                            "{resolutionResult.officialResponse}"
                          </div>
                          <span className="text-[9px] font-bold text-indigo-500 block text-right mt-1">✓ Sent automatically on behalf of {activeDept}</span>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              setSelectedIssue(null);
                              setResolutionResult(null);
                            }}
                            className="btn btn-outline px-6 py-2.5 text-xs font-bold"
                          >
                            {t('Back to Dashboard')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Main Action Input Form */
                      <form onSubmit={handleSubmitResolution} className="space-y-6">
                        
                        {/* High-Command Delegation Hub */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                            <span className="text-xl">🏛️</span>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('High-Command Delegation Hub')}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">{t('Delegate repair works and commands to subordinate staff according to category domain')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('Select Assigned Department Worker')}</label>
                              <select
                                value={assignedWorker}
                                onChange={e => setAssignedWorker(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500 bg-white"
                              >
                                <option value="">-- {t('Select Domain Specialist')} --</option>
                                {(JUNIOR_WORKERS_BY_DEPT[activeDept] || []).map(worker => (
                                  <option key={worker} value={worker}>{worker}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('SLA Completion Target Date')}</label>
                              <input
                                type="date"
                                value={slaDeadline}
                                onChange={e => setSlaDeadline(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-semibold text-slate-700"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('Official Command Directives')}</label>
                            <textarea
                              rows={2}
                              placeholder={t('e.g., Deploy with concrete patching mix immediately. Keep public transit pathway unobstructed.')}
                              value={officialCommands}
                              onChange={e => setOfficialCommands(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Close-Out & Status Section */}
                        <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-sm">
                          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                            <span className="text-xl">🎉</span>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('Field Repair Verification & Case Close-Out')}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">{t('Review completed repair work and trigger Gemini AI resolution dispatch')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">{t('Action Status')}</label>
                              <select
                                value={resolutionStatus}
                                onChange={e => setResolutionStatus(e.target.value as any)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-blue-500 bg-white"
                              >
                                <option value="In Progress">{t('In Progress')}</option>
                                <option value="Resolved">{t('Resolved')}</option>
                              </select>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                                {resolutionStatus === 'Resolved' 
                                  ? t('This will notify the reporter and award +100 XP.') 
                                  : t('Citizen timeline will show crew is working.')}
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                {t('Official Statement / Resolution Note')} {resolutionStatus === 'Resolved' && <span className="text-rose-500">*</span>}
                              </label>
                              <input
                                type="text"
                                placeholder={t('e.g., Repair completed successfully by the field team.')}
                                value={resolutionNote}
                                required={resolutionStatus === 'Resolved'}
                                onChange={e => setResolutionNote(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* After-Fix Photo Upload with AI Simulator */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                                {t('After-Fix Field Photo')} {resolutionStatus === 'Resolved' && <span className="text-rose-500">*</span>}
                              </label>
                              <button
                                type="button"
                                onClick={handleSimulatePhoto}
                                className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors px-2 py-1 rounded flex items-center gap-1 select-none cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{t('AI Simulate Repair Photo')}</span>
                              </button>
                            </div>

                            {resolvedImageBase64 ? (
                              <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video group shadow-inner">
                                <img src={resolvedImageBase64} alt="Resolved Site" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setResolvedImageBase64('')}
                                  className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black text-xs font-bold transition-all cursor-pointer"
                                >
                                  ✕
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-semibold py-1.5 px-3">
                                  ✓ Photo captured. Ready to submit.
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300 transition-all cursor-pointer relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <span className="text-xs font-bold text-slate-600 block">{t('Drag and drop resolved photo here')}</span>
                                <span className="text-[10px] text-slate-400 mt-1 block">{t('or tap to browse files on device')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedIssue(null)}
                            className="btn btn-outline py-2.5 px-5 text-xs font-bold"
                          >
                            {t('Cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={submittingResolution || (resolutionStatus === 'Resolved' && (!resolutionNote || !resolvedImageBase64))}
                            className="btn btn-success py-2.5 px-6 text-xs font-bold shadow-lg shadow-emerald-100 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 cursor-pointer"
                          >
                            {submittingResolution ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{t('Processing commands...')}</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>{t('Confirm Update & Dispatch AI Notification')}</span>
                              </>
                            )}
                          </button>
                        </div>

                      </form>
                    )}

                  </div>
                </div>
              ) : (
                /* Main Worklist Pane */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('Assigned Action Worklist')}</h3>
                      <p className="text-xs text-slate-400 font-medium">Showing issues routed to {t(activeDept)}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-black font-mono">
                      {deptIssues.length} {t('Active')}
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-12 text-center">
                      <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">{t('Refreshing workload queue...')}</p>
                    </div>
                  ) : deptIssues.length === 0 ? (
                    <div className="p-16 text-center space-y-4">
                      <span className="text-5xl block">🎉</span>
                      <h4 className="text-sm font-extrabold text-slate-700">{t('Clean Slate! No Pending Workloads')}</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        All citizen complaints assigned to your department have been resolved successfully. Great coordination!
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {deptIssues.map((issue, idx) => (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">#{issue._id.substring(0, 6)}</span>
                              <span className="text-xs">•</span>
                              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                issue.status === 'Resolved' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : issue.status === 'In Progress' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {t(issue.status)}
                              </span>
                              <span className="text-xs">•</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-extrabold">
                                {t(issue.category)}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-extrabold text-slate-800 mt-1 truncate">{issue.title}</h4>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{issue.location.address}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              <span>Reported {new Date(issue.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedIssue(issue);
                                setResolutionStatus(issue.status === 'Resolved' ? 'Resolved' : 'In Progress');
                                setResolutionNote('');
                                setResolvedImageBase64(issue.resolvedImage || '');
                                setAssignedWorker(issue.assignedWorker || '');
                                setOfficialCommands(issue.officialCommands || '');
                                setSlaDeadline(issue.slaDeadline ? issue.slaDeadline.split('T')[0] : '');
                                setResolutionResult(null);
                              }}
                              className="btn btn-primary px-4 py-2 text-xs flex items-center gap-1 shadow-sm font-extrabold"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>{t('Manage')}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
