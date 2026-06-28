import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../components/AppContext';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Camera, MapPin, CheckCircle, ArrowRight, ArrowLeft, UploadCloud, Sparkles, User, Brain, Heart, FileText, AlertTriangle, Info } from 'lucide-react';

const CYCLING_MESSAGES = [
  'Scanning image...',
  'Detecting issue...',
  'Assessing severity...',
  'Generating report...'
];

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const ReportIssue: React.FC = () => {
  const { token, showToast, refreshProfile } = useApp();
  const navigate = useNavigate();

  // Wizard Navigation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragActive, setDragActive] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Cycling message state
  const [cycleIndex, setCycleIndex] = useState(0);

  // Form Fields
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [severity, setSeverity] = useState('Medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');

  // AI results summary
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);

  // Confetti particles state
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; size: number; delay: number; duration: number }[]>([]);

  // Leaflet map ref
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Cycle smart messages while uploading/analyzing
  useEffect(() => {
    if (!loadingAI) return;

    const interval = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % CYCLING_MESSAGES.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [loadingAI]);

  // Generate confetti on Step 3 success ceremony
  useEffect(() => {
    if (step === 3) {
      const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#FF69B4', '#00FFFF'];
      const particles = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 1.5,
        duration: Math.random() * 2 + 2
      }));
      setConfetti(particles);
      
      // Auto refresh user profile to update XP immediately
      refreshProfile();
    }
  }, [step]);

  // Handle Drag / Drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageUpload(e.target.files[0]);
    }
  };

  // Submit file to AI analyze endpoint
  const processImageUpload = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setLoadingAI(true);
    setAiFailed(false);
    setCycleIndex(0);

    try {
      const base64 = await convertToBase64(file);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64, mimeType: file.type })
      });

      if (!res.ok) {
        showToast('AI analysis unavailable — please fill manually', 'warning');
        setAiFailed(true);
        setAiAnalysisResult(null);
        setLoadingAI(false);
        setStep(2);
        return;
      }

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.message || 'AI generation failed');
      }

      setAiAnalysisResult(data);

      // Map API outputs to Step 2 input states
      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategory(data.category || 'Other');
      setSeverity(data.severity || 'Medium');

      showToast('AI Analysis Complete! 🤖✨', 'success');
      setLoadingAI(false);
      setStep(2);
    } catch (err) {
      console.error('AI Analyze error:', err);
      showToast('AI analysis unavailable — please fill manually', 'warning');
      setAiFailed(true);
      setAiAnalysisResult(null);
      setLoadingAI(false);
      setStep(2);
    }
  };

  // Initialize and update Map selection (Step 2)
  useEffect(() => {
    if (step !== 2) return;

    const L = (window as any).L;
    if (!L) return;

    // Remove existing map if any to prevent Leaflet container duplicate issue
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default to Mumbai center
    const defaultCoords: [number, number] = [19.076, 72.8777];
    const initialCoords: [number, number] = lat && lng ? [lat, lng] : defaultCoords;

    const selectorMap = L.map('incident-selector-map').setView(initialCoords, 13);
    mapRef.current = selectorMap;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(selectorMap);

    // Initial Marker
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(selectorMap);
    }

    // Reverse Geocoding with OpenStreetMap Nominatim
    const reverseGeocode = async (latitude: number, longitude: number) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const geodata = await res.json();
          setAddress(geodata.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (err) {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    };

    // Prompt user for browser geolocation automatically to center map
    if (!lat || !lng) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const curLat = pos.coords.latitude;
          const curLng = pos.coords.longitude;
          setLat(curLat);
          setLng(curLng);
          selectorMap.setView([curLat, curLng], 15);
          
          if (markerRef.current) {
            markerRef.current.setLatLng([curLat, curLng]);
          } else {
            markerRef.current = L.marker([curLat, curLng], { draggable: true }).addTo(selectorMap);
          }
          reverseGeocode(curLat, curLng);
        },
        err => console.log('Location access denied, defaulting map focus.')
      );
    }

    // Handle map clicks to place/update marker
    selectorMap.on('click', (e: any) => {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      setLat(clickedLat);
      setLng(clickedLng);

      if (markerRef.current) {
        markerRef.current.setLatLng([clickedLat, clickedLng]);
      } else {
        markerRef.current = L.marker([clickedLat, clickedLng], { draggable: true }).addTo(selectorMap);
      }

      reverseGeocode(clickedLat, clickedLng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [step]);

  // Submit Issue Report (POST /api/issues)
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      showToast('Please specify a title and a description.', 'warning');
      return;
    }

    setLoadingSubmit(true);
    
    // Package parameters
    const issueData = {
      title,
      description,
      category,
      severity,
      lat: lat !== null ? lat : undefined,
      lng: lng !== null ? lng : undefined,
      address: address || undefined,
      isAnonymous,
      // Pass along the AI results structure so it gets stored
      aiAnalysis: aiAnalysisResult || {
        category,
        severity,
        description,
        confidence: 90,
        tags: [category.toLowerCase()],
        urgency_reason: 'Manually logged.'
      },
      image: imagePreview // Send base64 reference or image blob
    };

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(issueData)
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedIssueId(data._id);
        showToast('Complaint logged! +50 XP Earned! 🏆', 'success');
        setStep(3);
      } else {
        showToast(data.error || 'Failed to submit issue. Please check fields.', 'danger');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Network error while saving issue.', 'danger');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!token) {
    return <Navigate to="/login?redirect=/report" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="reporting-wizard">
      
      {/* Full-screen Dark Overlay when AI is generating */}
      {loadingAI && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center max-w-sm w-full mx-4 shadow-2xl text-center">
            {/* Spinning robot emoji 🤖 */}
            <div className="text-7xl animate-spin inline-block mb-6 select-none" style={{ animationDuration: '3s' }}>🤖</div>
            
            {/* "AI is scanning" */}
            <h3 className="text-xl font-bold text-white mb-2 font-sans">AI is scanning</h3>
            
            {/* Cycling sub-text */}
            <p className="text-sm text-blue-400 font-semibold animate-pulse tracking-wide min-h-[20px] font-sans">
              {CYCLING_MESSAGES[cycleIndex]}
            </p>

            {/* Animated Dots */}
            <div className="flex gap-2 mt-6 justify-center">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}
      
      {/* Confetti Spawner (Ceremony Step 3) */}
      {step === 3 && confetti.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}

      {/* Wizard Step Progression indicator */}
      <div className="flex justify-between items-center max-w-md mx-auto mb-10 relative">
        <div className="absolute left-0 right-0 h-0.5 bg-slate-200 z-0" />
        
        {/* Step 1 badge */}
        <div className="flex flex-col items-center relative z-10">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= 1 ? 'bg-blue-600 text-white font-black scale-110 shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'
          }`}>1</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase mt-2">📸 Image</span>
        </div>

        {/* Step 2 badge */}
        <div className="flex flex-col items-center relative z-10">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= 2 ? 'bg-blue-600 text-white font-black scale-110 shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'
          }`}>2</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase mt-2">📍 Location</span>
        </div>

        {/* Step 3 badge */}
        <div className="flex flex-col items-center relative z-10">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === 3 ? 'bg-emerald-500 text-white font-black scale-110 shadow-md shadow-emerald-100' : 'bg-slate-100 text-slate-400'
          }`}>3</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase mt-2">🏆 Reward</span>
        </div>
      </div>

      {/* STEP 1: Upload Photo */}
      {step === 1 && (
        <div className="custom-card bg-white p-8 md:p-12 text-center relative overflow-hidden" id="wizard-step-1">
          
          {/* Header */}
          <div className="max-w-md mx-auto mb-8">
            <span className="text-4xl mb-2 inline-block">📸</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Step 1: Upload Incident Photo</h2>
            <p className="text-slate-500 text-xs mt-1">Our Google Gemini AI will inspect the image to auto-categorize, write descriptions, and measure urgency indicators.</p>
          </div>

          {/* Upload Drop Zone area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all flex flex-col items-center justify-center bg-slate-50/50 min-h-[260px] relative ${
              dragActive ? 'border-blue-600 bg-blue-50/20' : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            {/* Input target */}
            <input
              type="file"
              id="file-upload-input"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <UploadCloud className="w-14 h-14 text-slate-300 mb-4 animate-bounce" />
            <p className="text-sm font-bold text-slate-700">Drag and drop your incident image here</p>
            <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, JPEG up to 10MB</p>
            
            <label
              htmlFor="file-upload-input"
              className="btn btn-primary text-xs font-bold shadow-md mt-6 py-2.5 px-5 cursor-pointer"
            >
              Browse Device Photo
            </label>
          </div>

          {/* Simple skips */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center text-xs">
            <button onClick={() => setStep(2)} className="text-slate-400 hover:text-blue-600 transition-colors font-bold flex items-center gap-1 cursor-pointer">
              Skip upload and file manually
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 2: Location and Details Form */}
      {step === 2 && (
        <form onSubmit={handleSubmitIssue} className="space-y-6" id="wizard-step-2">
          
          <div className="custom-card bg-white p-6">
            <h2 className="text-base font-extrabold text-slate-800 mb-4 border-b pb-2 flex items-center gap-1.5">
              <MapPin className="w-4.5 h-4.5 text-blue-600" />
              Pinpoint Incident Location
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">Ensure location matches the reported photo. Click directly on the map layout to relocate the pin if necessary.</p>

            {/* Interactive Leaflet Pin Selector */}
            <div className="w-full h-64 rounded-xl border border-slate-200 overflow-hidden relative mb-4">
              <div id="incident-selector-map" className="absolute inset-0 z-10 w-full h-full" />
            </div>

            {/* Captured address bar */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1">Incident Address</label>
              <input
                type="text"
                required
                placeholder="Click map or fetch location..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="custom-input w-full text-xs"
              />
            </div>
          </div>

          {/* Form details card */}
          <div className="custom-card bg-white p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              Complaint Case Dossier Details
            </h2>

            {/* AI Analysis Completion Banner */}
            {aiAnalysisResult && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4 flex items-center justify-between text-xs font-bold animate-scale-up">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span>AI Analysis Complete — {aiAnalysisResult.confidence || 85}% Confidence</span>
                </div>
              </div>
            )}

            {/* AI Fail Banner */}
            {aiFailed && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 flex items-center gap-2 text-xs font-bold animate-scale-up">
                <span>⚠️ AI analysis unavailable — please fill manually</span>
              </div>
            )}

            {/* Category and Severity side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                  <span>Category</span>
                  {aiAnalysisResult && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      AI filled this
                    </span>
                  )}
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`custom-input cursor-pointer text-xs transition-all ${
                    aiAnalysisResult ? 'border-l-4 border-l-blue-500 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm' : ''
                  }`}
                >
                  <option value="Pothole">Pothole 🕳️</option>
                  <option value="Street Light">Street Light 💡</option>
                  <option value="Water Leakage">Water Leakage 💧</option>
                  <option value="Garbage">Garbage Pile 🗑️</option>
                  <option value="Road Damage">Road Damage 🚧</option>
                  <option value="Encroachment">Encroachment 🏗️</option>
                  <option value="Noise Pollution">Noise Pollution 🔊</option>
                  <option value="Other">Other 📍</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                  <span>Severity Weight</span>
                  {aiAnalysisResult && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      AI filled this
                    </span>
                  )}
                </label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className={`custom-input cursor-pointer text-xs transition-all ${
                    aiAnalysisResult ? 'border-l-4 border-l-blue-500 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm' : ''
                  }`}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical Priority</option>
                </select>
              </div>

            </div>

            {/* Title field */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                <span>Issue Title</span>
                {aiAnalysisResult && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    AI filled this
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of the complaint (e.g. Broken street light near Gate 3)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`custom-input w-full text-xs font-bold transition-all ${
                  aiAnalysisResult ? 'border-l-4 border-l-blue-500 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm' : ''
                }`}
              />
            </div>

            {/* Description field */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                <span>Detailed Description</span>
                {aiAnalysisResult && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    AI filled this
                  </span>
                )}
              </label>
              <textarea
                required
                placeholder="Provide extra details on location landmarks, hazards, or repair history..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={`custom-input w-full min-h-[120px] text-xs leading-relaxed transition-all ${
                  aiAnalysisResult ? 'border-l-4 border-l-blue-500 bg-blue-50/10 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm' : ''
                }`}
              />
              
              {/* Show tags as colored chips below description */}
              {aiAnalysisResult?.tags && aiAnalysisResult.tags.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">AI Extracted Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiAnalysisResult.tags.map((tag: string, index: number) => (
                      <span key={index} className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Show urgency reason in a subtle gray info box */}
              {aiAnalysisResult?.urgency_reason && (
                <div className="bg-slate-50 border border-slate-100 text-slate-600 rounded-xl p-3.5 mt-3 text-xs flex flex-col gap-1">
                  <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    AI Urgency Reasoning
                  </span>
                  <span className="italic">"{aiAnalysisResult.urgency_reason}"</span>
                </div>
              )}
            </div>

            {/* Anonymous trigger check */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="anonymous-checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="anonymous-checkbox" className="text-xs font-bold text-slate-500 uppercase cursor-pointer select-none">
                Submit Report Anonymously
              </label>
            </div>
          </div>

          {/* Action Row buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline py-3 px-6 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Re-upload Image
            </button>

            <button
              type="submit"
              disabled={loadingSubmit}
              className="btn btn-success py-3 px-8 text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingSubmit ? 'Registering Report...' : 'Publish Civic Report'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      )}

      {/* STEP 3: Success Ceremony */}
      {step === 3 && (
        <div className="custom-card bg-white p-8 md:p-12 text-center max-w-xl mx-auto shadow-xl border-t-8 border-t-emerald-500 relative overflow-hidden" id="wizard-step-3">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse" />

          {/* Success visuals */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-inner animate-scale-up">
            <CheckCircle className="w-10 h-10 text-emerald-600 fill-emerald-50" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">Report Logged Successfully!</h2>
          <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">Thank you for improving your neighborhood. Action makes the city better.</p>

          {/* Reward Badge */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white max-w-sm mx-auto my-8 shadow-lg relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-6xl opacity-10">🏆</div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full block w-fit mx-auto mb-2">CIVIC HERO AWARD</span>
            <span className="text-3xl font-black block">+50 XP Earned</span>
            <p className="text-[10px] text-amber-100 mt-1.5">Check your profile cabinet to view unlocked status tiers and level progress!</p>
          </div>

          {/* Navigation Action options */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {createdIssueId && (
              <Link
                to={`/issue/${createdIssueId}`}
                className="btn btn-primary py-3 px-6 text-xs font-bold shadow-md"
              >
                View Your Report
              </Link>
            )}
            
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview('');
                setTitle('');
                setDescription('');
                setCategory('Other');
                setSeverity('Medium');
                setLat(null);
                setLng(null);
                setAddress('');
                setStep(1);
              }}
              className="btn btn-outline py-3 px-6 text-xs font-bold"
            >
              Report Another Issue
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
