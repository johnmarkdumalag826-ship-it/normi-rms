import React, { useState } from 'react';
import { 
  Landmark, ShieldAlert, Key, Mail, Lock, KeyRound, Check, RefreshCw, 
  GraduationCap, Shield, Users, Briefcase, UserCheck, ArrowRight, ArrowLeft
} from 'lucide-react';
import { User, UserRole } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onBackToLanding: () => void;
}

interface RoleConfig {
  role: UserRole;
  label: string;
  email: string;
  password: string;
  description: string;
  icon: React.ComponentType<any>;
  themeColor: string;
  activeColor: string;
}

export default function Login({ onLoginSuccess, users, onBackToLanding }: LoginProps) {
  const [step, setStep] = useState<'choose_role' | 'credentials'>('choose_role');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('student@normi.edu.ph'); 
  const [password, setPassword] = useState('student123'); 
  const [error, setError] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // OTP Verification state
  const [otpStage, setOtpStage] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const rolesConfig: RoleConfig[] = [
    {
      role: 'student',
      label: 'Student',
      email: 'student@normi.edu.ph',
      password: 'student123',
      description: 'Submit capstone manuscripts, track timeline milestones, and upload revisions.',
      icon: GraduationCap,
      themeColor: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-150',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300 text-emerald-900',
    },
    {
      role: 'adviser',
      label: 'Adviser',
      email: 'adviser@normi.edu.ph',
      password: 'adviser123',
      description: 'Guide student researchers, review advisee drafts, and request revision logs.',
      icon: Briefcase,
      themeColor: 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-150',
      activeColor: 'ring-2 ring-purple-500 bg-purple-50 border-purple-300 text-purple-900',
    },
    {
      role: 'panelist',
      label: 'Panel',
      email: 'panel@normi.edu.ph',
      password: 'panel123',
      description: 'Review assigned presentation manuscripts, highlight text, and log evaluations.',
      icon: Users,
      themeColor: 'bg-orange-50 text-orange-800 hover:bg-orange-100 border-orange-150',
      activeColor: 'ring-2 ring-orange-500 bg-orange-50 border-orange-300 text-orange-900',
    },
    {
      role: 'coordinator',
      label: 'Coordinator',
      email: 'coordinator@normi.edu.ph',
      password: 'coord123',
      description: 'Supervise pipelines, organize panel boards, and assign defense rooms.',
      icon: UserCheck,
      themeColor: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-150',
      activeColor: 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300 text-indigo-900',
    },
    {
      role: 'admin',
      label: 'Admin',
      email: 'admin@normi.edu.ph',
      password: 'admin123',
      description: 'Provision academic accounts, view system audit trails, and maintain backups.',
      icon: Shield,
      themeColor: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-150',
      activeColor: 'ring-2 ring-rose-500 bg-rose-50 border-rose-300 text-rose-900',
    }
  ];

  const handleRoleSelect = (role: UserRole) => {
    const config = rolesConfig.find(r => r.role === role);
    if (config) {
      setSelectedRole(role);
      setEmail(config.email);
      setPassword(config.password);
      setError(null);
      setStep('credentials');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailLower = email.trim().toLowerCase();
    
    // Resolve alias to existing rich seed data to provide the best user experience
    let targetEmail = emailLower;
    let aliasUser: User | undefined;

    if (emailLower === 'student@normi.edu.ph') {
      aliasUser = users.find(u => u.email === 'student.capstone@normi.edu.ph');
    } else if (emailLower === 'adviser@normi.edu.ph') {
      aliasUser = users.find(u => u.email === 'adv.dumalag@normi.edu.ph');
    } else if (emailLower === 'panel@normi.edu.ph') {
      aliasUser = users.find(u => u.email === 'panel.pendelton@normi.edu.ph');
    }

    let user: User;
    if (aliasUser) {
      user = {
        ...aliasUser,
        email: emailLower // Keep their typed login email
      };
    } else {
      const found = users.find(u => u.email.toLowerCase() === emailLower);
      if (found) {
        user = found;
      } else {
        const prefix = emailLower.split('@')[0];
        const name = prefix
          .split(/[._+-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

        user = {
          id: `user-gen-${Date.now()}`,
          email: emailLower,
          name: name || `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} User`,
          role: selectedRole,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(prefix || 'user')}`,
          registeredAt: new Date().toISOString(),
          status: 'active'
        };
      }
    }

    if (user.status !== 'active') {
      setError('This account has been suspended or is pending approval.');
      return;
    }

    // Since this is a high-fidelity demonstration, we simulate OTP multi-factor authentication
    setPendingUser(user);
    setOtpStage(true);
    setOtpError(false);
    setOtpCode(['', '', '', '']);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    
    if (fullCode.length < 4) {
      setOtpError(true);
      return;
    }

    setOtpVerified(true);
    setTimeout(() => {
      if (pendingUser) {
        onLoginSuccess(pendingUser);
      }
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    // Auto focus next input
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setForgotPassword(false);
    }, 2500);
  };

  const currentRoleConfig = rolesConfig.find(r => r.role === selectedRole) || rolesConfig[0];
  const SelectedIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f1f5f9] via-[#f8fafc] to-[#e0e7ff] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-10 left-10 w-[40%] h-[40%] bg-blue-300/10 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[50%] h-[50%] bg-indigo-300/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        
        {/* Institutional Header Banner */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={onBackToLanding}>
            <Landmark className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-extrabold text-slate-800 uppercase tracking-tight leading-none">
              Northern Mindanao Colleges, Inc.
            </h1>
            <p className="text-xs font-bold text-blue-900 tracking-widest uppercase">
              Web-Based Research Management & Monitoring System
            </p>
          </div>
        </div>

        {/* STEP 1: PORTAL CHOOSE ROLE */}
        {step === 'choose_role' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center max-w-md mx-auto">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Select your Academic Portal
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose your specific role to log in and access your personalized workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {rolesConfig.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.role}
                    onClick={() => handleRoleSelect(item.role)}
                    className="flex flex-col text-left p-5 bg-white/85 backdrop-blur-md rounded-2xl border border-slate-150 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group relative cursor-pointer overflow-hidden shadow-sm"
                  >
                    <div className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-4 transition-colors ${item.themeColor}`}>
                      <IconComp className="h-6 w-6 shrink-0" />
                    </div>
                    <div className="space-y-1 mt-auto">
                      <h3 className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-blue-900 flex items-center gap-1">
                        {item.label} Portal
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-800" />
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 text-[8px] font-mono text-slate-300 font-bold uppercase tracking-wider group-hover:text-blue-800/40">
                      Access
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <button
                onClick={onBackToLanding}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Public Repository Home
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CREDENTIALS FOR CHOSEN ROLE */}
        {step === 'credentials' && (
          <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Active Portal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${currentRoleConfig.themeColor}`}>
                  <SelectedIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    Institutional Gate
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                    {currentRoleConfig.label} Workspace Portal
                  </h3>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setStep('choose_role')}
                className="text-[10px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Change Role
              </button>
            </div>

            {forgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b">
                  Reset Institutional Password
                </h3>
                
                {resetSent ? (
                  <div className="p-3.5 rounded-xl bg-green-50 border border-green-150 text-green-800 text-[11px] leading-relaxed space-y-1.5 text-center">
                    <Check className="h-5 w-5 text-green-600 mx-auto animate-bounce" />
                    <p className="font-bold">Reset Guidelines Sent!</p>
                    <p className="text-slate-500 text-[10px]">
                      A secure recovery link has been dispatched to your academic inbox directory.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Please enter your registered institutional email. The system will verify your profile and dispatch temporary credentials.
                    </p>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Academic Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. key@normi.edu.ph"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotPassword(false)}
                        className="w-1/2 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold py-2 rounded-lg shadow-md cursor-pointer"
                      >
                        Send Password Reset
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : otpStage ? (
              /* Two-Factor verification step */
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="text-center space-y-1.5">
                  <span className="inline-block p-2 bg-blue-50 rounded-full">
                    <KeyRound className="h-5 w-5 text-blue-600" />
                  </span>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Secure 2FA Code Verified
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A verification token was sent to <strong className="text-slate-700 font-bold">{pendingUser?.email}</strong>. Enter any 4-digit code (e.g. <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">1234</span>) to log in.
                  </p>
                </div>

                {otpVerified ? (
                  <div className="py-4 text-center space-y-2">
                    <div className="inline-flex p-1.5 bg-green-100 text-green-800 rounded-full">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-green-700 font-bold">Authenticated Successfully!</p>
                    <p className="text-[10px] text-slate-400">Opening secure university dashboard environment...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center gap-3.5 pt-2">
                      {otpCode.map((val, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          maxLength={1}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          aria-label={`Digit ${idx + 1} of verification code`}
                          value={val}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-mono font-extrabold border border-[#D1D5DB] rounded-xl bg-white text-slate-800 transition-all duration-300 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 focus:scale-[1.03] outline-none shadow-sm"
                        />
                      ))}
                    </div>

                    {otpError && (
                      <p className="text-[10px] text-rose-600 text-center font-bold">
                        Please enter all 4 slots. Try '1234' for sandbox ease.
                      </p>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Didn't receive code?</span>
                      <button type="button" className="text-blue-950 hover:underline flex items-center gap-0.5 font-bold">
                        <RefreshCw className="h-2.5 w-2.5" /> Resend Code
                      </button>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setOtpStage(false)}
                        className="w-1/2 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold py-2 rounded-lg shadow-md cursor-pointer"
                      >
                        Verify & Access
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* Core Credentials Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[10px] leading-normal flex items-start gap-1.5 font-semibold">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Institutional Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`${selectedRole}@normi.edu.ph`}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        Academic Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-[10px] text-blue-900 font-bold hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                    Demonstration Coordinates
                  </span>
                  <div className="flex justify-between items-center text-[11px] text-slate-700">
                    <span>Email: <strong className="font-mono text-[10px] font-bold text-slate-900">{currentRoleConfig.email}</strong></span>
                    <span>Pass: <strong className="font-mono text-[10px] font-bold text-slate-900">{currentRoleConfig.password}</strong></span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    * Clicking the "Secure Login" button will process with this predefined sample account.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('choose_role')}
                    className="w-1/3 py-2.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-blue-800/10 transition-colors cursor-pointer"
                  >
                    Secure Login
                  </button>
                </div>

              </form>
            )}

            <div className="text-center text-[10px] text-slate-400 border-t pt-3">
              Protected by NORMI Academic Network Access Control Policy
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
