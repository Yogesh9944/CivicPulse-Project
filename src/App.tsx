import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './components/AppContext';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { ReportIssue } from './pages/ReportIssue';
import { Feed } from './pages/Feed';
import { IssueDetail } from './pages/IssueDetail';
import { Dashboard } from './pages/Dashboard';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { Auth } from './pages/Auth';
import { AuthorityPortal } from './pages/AuthorityPortal';
import { CivicBot } from './components/CivicBot';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root-layout">
          {/* Top persistent Navigation Bar */}
          <Navbar />
          
          {/* Main App Page View Router */}
          <main className="flex-1 w-full">
            <Routes>
              {/* Home Landing page */}
              <Route path="/" element={<Landing />} />
              
              {/* Official Authority portal */}
              <Route path="/authority" element={<AuthorityPortal />} />
              
              {/* Report Issue multi-wizard (Auth guarded internally) */}
              <Route path="/report" element={<ReportIssue />} />
              
              {/* Feed lists page (grid / Map toggle) */}
              <Route path="/feed" element={<Feed />} />
              
              {/* Individual Complaint detail dossier */}
              <Route path="/issue/:id" element={<IssueDetail />} />
              
              {/* Statistical community insights */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Citizien podium and point rules */}
              <Route path="/leaderboard" element={<Leaderboard />} />
              
              {/* Personal profile tracking, stats and cabinet badges */}
              <Route path="/profile" element={<Profile />} />
              
              {/* Authentication entryways */}
              <Route path="/login" element={<Auth initialMode="login" />} />
              <Route path="/register" element={<Auth initialMode="register" />} />
            </Routes>
          </main>

          {/* Floating AI chat assistant */}
          <CivicBot />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
