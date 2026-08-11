import React, { useState } from 'react';
import { 
  Landmark, BookOpen, Calendar, Clock, FileText, ShieldCheck, ArrowRight, 
  Users, Mail, Phone, MapPin, Sparkles, Award, User, CheckCircle, 
  MessageSquare, X, Info, Search
} from 'lucide-react';
import { Announcement } from '../types';

interface LandingPageProps {
  announcements: Announcement[];
  onEnterPortal: () => void;
  stats: {
    archived: number;
    active: number;
    advisers: number;
    scheduled: number;
  };
}

export default function LandingPage({ announcements, onEnterPortal, stats }: LandingPageProps) {
  const [activeModal, setActiveModal] = useState<'about' | 'repository' | 'contact' | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 relative font-sans flex flex-col justify-between selection:bg-blue-200 selection:text-blue-900">
      
      {/* Scope CSS Styles for Animations */}
      <style>{`
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-opposite {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(8px) rotate(-1.5deg); }
        }
        @keyframes flow-dash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.15); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes drift-particle {
          0%, 100% { transform: translate(0px, 0px); opacity: 0.2; }
          50% { transform: translate(15px, -15px); opacity: 0.6; }
        }
        .anim-float-gentle {
          animation: float-gentle 6s ease-in-out infinite;
        }
        .anim-float-opposite {
          animation: float-opposite 5s ease-in-out infinite;
        }
        .anim-flow-line {
          stroke-dasharray: 6, 4;
          animation: flow-dash 1.2s linear infinite;
        }
        .anim-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .anim-rotate-slow {
          animation: rotate-slow 25s linear infinite;
        }
        .anim-drift-1 {
          animation: drift-particle 8s ease-in-out infinite;
        }
        .anim-drift-2 {
          animation: drift-particle 11s ease-in-out infinite;
        }
      `}</style>

      {/* Background soft pastel ambient circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-100/60 blur-[130px] anim-rotate-slow"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[120px] anim-rotate-slow" style={{ animationDirection: 'reverse' }}></div>
        <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-sky-100/40 blur-[100px] anim-drift-1"></div>
        <div className="absolute bottom-[30%] right-[30%] w-[280px] h-[280px] rounded-full bg-indigo-100/30 blur-[90px] anim-drift-2"></div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-75"></div>
      </div>

      {/* Top Navigation Bar */}
      <header className="bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-800 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <Landmark className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider block leading-none mb-0.5">Northern Mindanao Colleges, Inc.</span>
              <span className="text-xs font-semibold text-slate-500 font-mono tracking-tight">Research Management Portal</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7">
            <button 
              onClick={() => setActiveModal(null)} 
              className="text-xs font-semibold text-blue-900 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => setActiveModal('about')} 
              className="text-xs font-semibold text-slate-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              About
            </button>
            <button 
              onClick={() => setActiveModal('repository')} 
              className="text-xs font-semibold text-slate-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Repository
            </button>
            <button 
              onClick={() => setActiveModal('contact')} 
              className="text-xs font-semibold text-slate-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          <button 
            id="nav-login-btn"
            onClick={onEnterPortal}
            className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-4.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-blue-800/10 hover:shadow-md cursor-pointer active:scale-95"
          >
            Portal Login
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Splitted Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 py-4 overflow-hidden">
        
        {/* Left Hand Side Column (45%) */}
        <section className="lg:col-span-5 flex flex-col justify-center space-y-5 lg:pr-4 h-full text-left">
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Comprehensive Academic Workspace
            </div>
            
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Web-Based <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-700">Research Management</span> & Monitoring System
            </h1>
            
            <p className="text-slate-650 text-[12.5px] leading-relaxed font-normal text-justify">
              Simplifying the complete academic research lifecycle for <strong className="text-slate-800 font-semibold">Northern Mindanao Colleges, Inc.</strong> This system streamlines online submissions, manages version tracking, automates defense scheduling with panel conflict resolution, and serves as the official institutional digital repository for research, thesis, and capstone projects across all departments.
            </p>
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button 
              onClick={onEnterPortal}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-800/20 cursor-pointer active:scale-95"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button 
              onClick={() => setActiveModal('about')}
              className="border border-slate-200 hover:border-slate-350 bg-white/70 backdrop-blur-xs text-slate-700 text-xs font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-sm cursor-pointer"
            >
              Learn More
            </button>
          </div>

          {/* Compact Mini Stats Footer */}
          <div className="grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-5 mt-2">
            <div>
              <span className="block text-lg font-extrabold text-blue-900 font-mono leading-none">{stats.archived}+</span>
              <span className="text-[9px] text-slate-450 font-bold tracking-wider uppercase block mt-1">Publications</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-blue-900 font-mono leading-none">{stats.active}</span>
              <span className="text-[9px] text-slate-450 font-bold tracking-wider uppercase block mt-1">Active Projects</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-blue-900 font-mono leading-none">{stats.advisers}</span>
              <span className="text-[9px] text-slate-450 font-bold tracking-wider uppercase block mt-1">Designated Advisers</span>
            </div>
          </div>
        </section>

        {/* Right Hand Side Column (55%) - Animated Vector Illustration */}
        <section className="lg:col-span-7 hidden lg:flex items-center justify-center relative h-full select-none">
          
          {/* Main Visual Composition Panel */}
          <div className="w-full max-w-[580px] h-[380px] relative flex items-center justify-center">
            
            {/* SVG Background Connections Canvas */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
              {/* Outer boundary circles */}
              <circle cx="50%" cy="50%" r="160" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="110" fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1" />
              
              {/* Moving laser connection lines from outer roles to center hub */}
              {/* Student (15%, 25%) to Center (50%, 50%) */}
              <path d="M 120, 110 L 290, 190" fill="none" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5" className="anim-flow-line" />
              {/* Adviser (85%, 20%) to Center (50%, 50%) */}
              <path d="M 460, 100 L 290, 190" fill="none" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5" className="anim-flow-line" style={{ animationDirection: 'reverse' }} />
              {/* Coordinator (20%, 75%) to Center (50%, 50%) */}
              <path d="M 130, 280 L 290, 190" fill="none" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="1.5" className="anim-flow-line" />
              {/* Panel Member (82%, 75%) to Center (50%, 50%) */}
              <path d="M 450, 280 L 290, 190" fill="none" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="1.5" className="anim-flow-line" style={{ animationDirection: 'reverse' }} />
            </svg>

            {/* Central Master Hub Node */}
            <div className="absolute z-10 w-24 h-24 rounded-full bg-blue-900 flex flex-col items-center justify-center shadow-xl shadow-blue-900/35 border-4 border-white transition-transform hover:scale-105 duration-300">
              <div className="absolute inset-0 rounded-full bg-blue-600/35 anim-pulse-glow z-0"></div>
              <Landmark className="h-8 w-8 text-white relative z-10 mb-0.5" />
              <span className="text-[8px] font-mono font-bold text-blue-200 tracking-wider relative z-10">RMMS CORE</span>
            </div>

            {/* Floating Role Nodes */}
            {/* 1. Student Node */}
            <div className="absolute left-[50px] top-[70px] z-20 flex flex-col items-center gap-1.5 anim-float-gentle">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-150 shadow-md flex items-center justify-center hover:border-indigo-400 transition-colors">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">Students</span>
            </div>

            {/* 2. Adviser Node */}
            <div className="absolute right-[60px] top-[60px] z-20 flex flex-col items-center gap-1.5 anim-float-opposite">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-150 shadow-md flex items-center justify-center hover:border-emerald-400 transition-colors">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">Advisers</span>
            </div>

            {/* 3. Coordinator Node */}
            <div className="absolute left-[60px] bottom-[60px] z-20 flex flex-col items-center gap-1.5 anim-float-opposite">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-150 shadow-md flex items-center justify-center hover:border-blue-400 transition-colors">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">Coordinators</span>
            </div>

            {/* 4. Panel Node */}
            <div className="absolute right-[70px] bottom-[65px] z-20 flex flex-col items-center gap-1.5 anim-float-gentle">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-150 shadow-md flex items-center justify-center hover:border-amber-400 transition-colors">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">Panelists</span>
            </div>

            {/* Floating Glassmorphic Document Cards (Workflows) */}
            {/* File 1: Student Manuscript Draft */}
            <div className="absolute left-[130px] top-[160px] z-25 bg-white/80 backdrop-blur-md border border-slate-150 rounded-xl p-2.5 shadow-lg flex items-center gap-2 max-w-[150px] anim-float-gentle" style={{ animationDelay: '1s' }}>
              <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-slate-800 block truncate leading-none">Proposal_Draft.docx</span>
                <span className="text-[8px] font-mono font-medium text-slate-400 block mt-0.5 uppercase">Uploaded</span>
              </div>
            </div>

            {/* File 2: Adviser Review Stamp */}
            <div className="absolute right-[120px] top-[145px] z-25 bg-white/80 backdrop-blur-md border border-slate-150 rounded-xl p-2.5 shadow-lg flex items-center gap-2 max-w-[150px] anim-float-opposite" style={{ animationDelay: '0.5s' }}>
              <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-slate-800 block truncate leading-none">Adviser_Endorsed</span>
                <span className="text-[8px] font-mono font-semibold text-emerald-600 block mt-0.5 uppercase">Approved</span>
              </div>
            </div>

            {/* File 3: Automated Calendar Schedule slot */}
            <div className="absolute right-[150px] bottom-[115px] z-25 bg-white/80 backdrop-blur-md border border-slate-150 rounded-xl p-2.5 shadow-lg flex items-center gap-2 max-w-[160px] anim-float-gentle" style={{ animationDelay: '1.5s' }}>
              <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-slate-800 block truncate leading-none">Defense Slot Booked</span>
                <span className="text-[8px] font-mono font-medium text-slate-400 block mt-0.5 uppercase">No Conflicts</span>
              </div>
            </div>

            {/* Decorative Tiny Floating particles */}
            <div className="absolute top-[40px] left-[50%] w-2 h-2 rounded-full bg-blue-500/40 anim-pulse-glow" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute bottom-[40px] left-[45%] w-3 h-3 rounded-full bg-indigo-500/30 anim-pulse-glow" style={{ animationDelay: '0.8s' }}></div>
            <div className="absolute top-[180px] right-[40px] w-1.5 h-1.5 rounded-full bg-sky-500/55 anim-pulse-glow"></div>
            <div className="absolute bottom-[160px] left-[40px] w-2 h-2 rounded-full bg-amber-500/40 anim-pulse-glow" style={{ animationDelay: '1.1s' }}></div>
          </div>
        </section>

      </main>

      {/* Footer Bottom coordinates */}
      <footer className="bg-white/40 backdrop-blur-sm border-t border-slate-200/50 py-3.5 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-[10.5px] text-slate-450 font-medium">
          <p>© {new Date().getFullYear()} Northern Mindanao Colleges, Inc. All rights reserved.</p>
          <div className="flex items-center gap-1 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
            <span className="font-mono text-[9.5px]">Institutional RMMS Service Active</span>
          </div>
        </div>
      </footer>

      {/* INTERACTIVE COMPREHENSIVE MODALS (fits in 100vh overlay) */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-lg p-6 relative overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-blue-900">
                {activeModal === 'about' && <Info className="h-5 w-5" />}
                {activeModal === 'repository' && <BookOpen className="h-5 w-5" />}
                {activeModal === 'contact' && <MapPin className="h-5 w-5" />}
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {activeModal === 'about' && "System Situation & Mission"}
                  {activeModal === 'repository' && "Digital Archives Overview"}
                  {activeModal === 'contact' && "Institutional Desk Directory"}
                </h2>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close overlay"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content (Safe inside modal) */}
            <div className="overflow-y-auto flex-1 text-xs text-slate-600 space-y-4 pr-1">
              
              {/* 1. ABOUT MODAL CONTENT */}
              {activeModal === 'about' && (
                <>
                  <p className="leading-relaxed text-justify">
                    At <strong className="text-slate-800">Northern Mindanao Colleges, Inc. (NORMI)</strong>, academic completions require precision, coordination, and structural continuity. Historically, manual reviews, disjointed feedback emails, and physical schedule logs created unnecessary friction.
                  </p>
                  <p className="leading-relaxed text-justify">
                    This system establishes a unified, centralized repository and monitor. It connects students directly with assigned faculty advisers, coordinates defense slots by checking institutional space and panel Availability, and ensures zero scheduling overlaps.
                  </p>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Our Principal Objectives
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-650 leading-relaxed text-justify">
                      <li>Streamline draft manuscript checks and secure online revisions.</li>
                      <li>Eliminate scheduling gridlocks via automated conflict checker algorithms.</li>
                      <li>Preserve completed projects, theses, and capstones across all academic departments.</li>
                    </ul>
                  </div>
                </>
              )}

              {/* 2. REPOSITORY MODAL CONTENT */}
              {activeModal === 'repository' && (
                <>
                  <p className="leading-relaxed text-justify">
                    The digital repository operates as NORMI's official, durable digital archive. It contains completed and peer-vetted publications, thesis documents, and capstones, categorized by department.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                      <span className="block text-xl font-bold font-mono text-blue-900">{stats.archived}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Archived Manuscripts</span>
                    </div>
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
                      <span className="block text-xl font-bold font-mono text-indigo-900">{stats.active}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Underactive Vettings</span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-justify">
                    Access to the repository is granted to active Students, Faculty members, and Institutional Administrators. You can search, index, filter, and reference full publications through the unified portal.
                  </p>
                  <div className="pt-2 text-center shrink-0">
                    <button 
                      onClick={() => {
                        setActiveModal(null);
                        onEnterPortal();
                      }}
                      className="inline-flex items-center gap-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Access Digital Archive
                    </button>
                  </div>
                </>
              )}

              {/* 3. CONTACT MODAL CONTENT */}
              {activeModal === 'contact' && (
                <>
                  <p className="leading-relaxed">
                    Have questions about submitting your proposal, joining a panel, or setting up advisor controls? Connect with our dedicated administrative desk:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-150 bg-slate-50/50">
                      <MapPin className="h-4.5 w-4.5 text-blue-800 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800 font-bold block text-[11px] uppercase tracking-wide">NORMI Main Campus</strong>
                        <span className="text-[11px] block text-slate-500">City of Cabadbaran, Agusan del Norte, Philippines</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-150 bg-slate-50/50">
                      <Mail className="h-4.5 w-4.5 text-blue-800 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800 font-bold block text-[11px] uppercase tracking-wide">Electronic Desks</strong>
                        <span className="text-[11px] block text-slate-500">coordinator@northernmindanaocolleges.edu.ph</span>
                        <span className="text-[11px] block text-slate-500">research.support@northernmindanaocolleges.edu.ph</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-150 bg-slate-50/50">
                      <Phone className="h-4.5 w-4.5 text-blue-800 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800 font-bold block text-[11px] uppercase tracking-wide">Phone Hotlines</strong>
                        <span className="text-[11px] block text-slate-500">+63 (085) 343-1254 / +63 (0912) 456-7890</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 text-center shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Northern Mindanao Colleges, Inc. • RMMS Service</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
