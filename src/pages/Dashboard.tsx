import React, { useState, useEffect, useRef } from 'react';
import { DashboardStats, Insight } from '../types';
import { BarChart, TrendingUp, Clock, AlertTriangle, Sparkles, Brain } from 'lucide-react';

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

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // Chart canvas refs
  const categoryChartRef = useRef<HTMLCanvasElement | null>(null);
  const severityChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartRef = useRef<HTMLCanvasElement | null>(null);

  // Chart instance trackers
  const categoryChartInstance = useRef<any>(null);
  const severityChartInstance = useRef<any>(null);
  const trendChartInstance = useRef<any>(null);

  // Map instance tracker
  const mapRef = useRef<any>(null);

  // Fetch Dashboard Stats
  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard stats:', err);
        setLoading(false);
      });
  }, []);

  // Initialize and Render Charts once stats are available
  useEffect(() => {
    if (!stats) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    // 1. Doughnut Chart: Issues by Category
    if (categoryChartRef.current) {
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();

      const labels = stats.issuesByCategory.map(item => item.name);
      const dataValues = stats.issuesByCategory.map(item => item.value);
      const bgColors = labels.map(label => CATEGORY_COLORS[label] || '#6B7280');

      categoryChartInstance.current = new Chart(categoryChartRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: bgColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 2. Bar Chart: Issues by Severity
    if (severityChartRef.current) {
      if (severityChartInstance.current) severityChartInstance.current.destroy();

      const labels = stats.issuesBySeverity.map(item => item.name);
      const dataValues = stats.issuesBySeverity.map(item => item.value);
      const bgColors = labels.map(label => {
        if (label === 'Critical') return '#EF4444'; // Red
        if (label === 'High') return '#F59E0B';     // Orange
        if (label === 'Medium') return '#EAB308';   // Yellow
        return '#10B981';                           // Green
      });

      severityChartInstance.current = new Chart(severityChartRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Issues Count',
            data: dataValues,
            backgroundColor: bgColors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Line Chart: Issues Reported vs Resolved over 30 days
    if (trendChartRef.current) {
      if (trendChartInstance.current) trendChartInstance.current.destroy();

      const labels = stats.issuesByDay.map(item => item.date);
      const reportedData = stats.issuesByDay.map(item => item.count);
      const resolvedData = stats.issuesByDay.map(item => item.resolved);

      trendChartInstance.current = new Chart(trendChartRef.current, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Reported',
              data: reportedData,
              borderColor: '#2563EB', // Blue
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Resolved',
              data: resolvedData,
              borderColor: '#10B981', // Green
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Cleanup Charts on Unmount
    return () => {
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();
      if (severityChartInstance.current) severityChartInstance.current.destroy();
      if (trendChartInstance.current) trendChartInstance.current.destroy();
    };
  }, [stats]);

  // Render Leaflet Hotspot Map once hotspots are available
  useEffect(() => {
    if (!stats || stats.hotspots.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy map instance if it already exists to prevent re-initialization error
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Centered around Mumbai average hotspots coordinates
    const defaultCoords: [number, number] = [19.076, 72.8777];
    const targetMap = L.map('dashboard-hotspot-map').setView(defaultCoords, 11);
    mapRef.current = targetMap;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(targetMap);

    // Place circle markers proportioned by count
    stats.hotspots.forEach(hotspot => {
      const circle = L.circle([hotspot.lat, hotspot.lng], {
        color: '#7C3AED', // Purple hotspot boundary
        fillColor: '#7C3AED',
        fillOpacity: 0.4,
        radius: 300 + hotspot.count * 120 // Radius scales proportionally by count
      }).addTo(targetMap);

      circle.bindPopup(`
        <div style="font-family: inherit;">
          <h4 style="margin: 0 font-weight: bold; color: #1E293B; font-size: 13px;">🔥 Active Hotspot</h4>
          <p style="margin: 6px 0 0; color: #64748B; font-size: 11px;">📍 ${hotspot.address.split(',')[0]}</p>
          <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; color: #4F46E5;">Count: ${hotspot.count} cases • Primary Category: ${hotspot.category}</p>
        </div>
      `);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stats]);

  // Call POST /api/ai/insights
  const handleGenerateInsights = async () => {
    if (!stats) return;

    setGeneratingInsights(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stats })
      });

      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      } else {
        console.error('Insights generation failed.');
      }
    } catch (e) {
      console.error('Insights exception:', e);
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <span className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-slate-500 mt-4 font-semibold text-sm">Aggregating civic analytics dashboards...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="dashboard-page">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Civic Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Live statistical overviews of infrastructure issues and resolutions reported across Mumbai.</p>
        </div>
        
        {/* Right side static badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Synchronized Live
        </span>
      </div>

      {/* Row of 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        
        {/* Total Issues */}
        <div className="custom-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Logged</span>
            <span className="text-xl">🏛️</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalIssues}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Submitted in last 30 days</p>
          </div>
        </div>

        {/* Resolved This Week */}
        <div className="custom-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resolved</span>
            <span className="text-xl">📈</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.resolvedIssues}</span>
            <p className="text-[10px] text-emerald-500 font-medium mt-1">
              {stats.totalIssues > 0 ? `${((stats.resolvedIssues / stats.totalIssues) * 100).toFixed(0)}% resolution rate` : '0%'}
            </p>
          </div>
        </div>

        {/* Avg Resolution Days */}
        <div className="custom-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Avg Fix Time</span>
            <span className="text-xl">⏱️</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-blue-600">{stats.avgResolutionTime} Days</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">From initial log to confirmation</p>
          </div>
        </div>

        {/* Active Citizens */}
        <div className="custom-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Citizens</span>
            <span className="text-xl">👥</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-purple-600">{stats.activeUsers}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Earned XP through participation</p>
          </div>
        </div>

      </div>

      {/* Row of 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Chart 1: Doughnut Category */}
        <div className="custom-card bg-white p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <BarChart className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-800">Issues by Category</h3>
          </div>
          <div className="h-64 relative">
            <canvas ref={categoryChartRef} />
          </div>
        </div>

        {/* Chart 2: Line Trend */}
        <div className="custom-card bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-800">Reporting & Resolution Trends (30 Days)</h3>
          </div>
          <div className="h-64 relative">
            <canvas ref={trendChartRef} />
          </div>
        </div>

      </div>

      {/* Grid: Bar Chart Severity & Hotspot Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Chart 3: Severity Bar Chart */}
        <div className="custom-card bg-white p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-800">Issues by Severity</h3>
          </div>
          <div className="h-64 relative">
            <canvas ref={severityChartRef} />
          </div>
        </div>

        {/* Hotspots Section */}
        <div className="custom-card bg-white p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500" />
              Active Density Hotspots
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Radius proportional to frequency</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            
            {/* Map Element */}
            <div className="md:col-span-2 rounded-lg border border-slate-200 overflow-hidden relative min-h-[220px]">
              <div id="dashboard-hotspot-map" className="absolute inset-0 z-10 w-full h-full" />
            </div>

            {/* Hotspots List Column */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
              {stats.hotspots.map((hot, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs hover:border-purple-200 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-800 truncate max-w-[110px]">🔥 Hotspot {idx+1}</span>
                    <span className="font-bold text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.2 rounded-full">{hot.count} Cases</span>
                  </div>
                  <p className="text-slate-400 text-[10px] truncate">{hot.address.split(',')[0]}</p>
                  <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase text-left">Primary: {hot.category}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* AI Insights Panel */}
      <div className="custom-card p-6 bg-gradient-to-r from-purple-900 to-indigo-900 border-none text-white relative overflow-hidden mb-4">
        {/* background vector accents */}
        <div className="absolute right-0 top-0 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="max-w-2xl text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-purple-200 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Brain className="w-3.5 h-3.5" />
              Gemini 1.5 Flash Analytics
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Generate Smart Community Insights</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Analyze current city indicators using Google AI to discover localized trends, predict escalation hazards, and generate actionable recommendations.
            </p>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
            className="btn font-extrabold text-slate-900 bg-white hover:bg-slate-100 shrink-0 shadow-lg px-6 py-3.5 text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            {generatingInsights ? 'Analyzing...' : 'Generate AI Insights'}
          </button>

        </div>

        {/* Loading Spinner */}
        {generatingInsights && (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-scale-up">
            <span className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-purple-200 uppercase tracking-wider">AI is analyzing community data...</p>
          </div>
        )}

        {/* Insights Results Grid */}
        {!generatingInsights && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/10 animate-scale-up">
            {insights.map((ins, idx) => {
              let priColor = 'border-blue-400 bg-blue-500/10 text-blue-200';
              let badgeColor = 'bg-blue-600/30 text-blue-100';
              if (ins.priority === 'High') {
                priColor = 'border-rose-400 bg-rose-500/10 text-rose-200';
                badgeColor = 'bg-rose-600/30 text-rose-100';
              } else if (ins.priority === 'Medium') {
                priColor = 'border-amber-400 bg-amber-500/10 text-amber-200';
                badgeColor = 'bg-amber-600/30 text-amber-100';
              }

              return (
                <div
                  key={idx}
                  className={`border-l-4 p-5 rounded-r-xl transition-all hover:translate-y-[-2px] ${priColor}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeColor}`}>
                      {ins.priority} Priority
                    </span>
                    <span className="text-xs">✨</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white line-clamp-1 mb-2">{ins.title}</h4>
                  <p className="text-slate-200 text-xs leading-relaxed">{ins.insight}</p>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
