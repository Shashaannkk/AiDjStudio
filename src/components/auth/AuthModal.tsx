import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Settings,
  ShieldCheck,
  Disc3,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { userService } from '../../services/userService';
import { DISC_ALBUM_COVERS } from '../../fixtures/musicFixtures';
import { Logo } from '../common/Logo';

declare const google: any;

export const AuthModal: React.FC = () => {
  const { authModalOpen, closeAuthModal, authMode, login } = usePlayerStore();
  const [isLogin, setIsLogin] = useState(authMode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAuthNotice, setGoogleAuthNotice] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spinning disc album cover auto-cycling every 3 seconds
  const [coverIndex, setCoverIndex] = useState(0);

  // Google Client ID state
  const [customClientId, setCustomClientId] = useState(userService.getGoogleClientId());

  const [prevAuthMode, setPrevAuthMode] = useState(authMode);
  if (prevAuthMode !== authMode) {
    setPrevAuthMode(authMode);
    setIsLogin(authMode === 'login');
  }

  // Cycle vinyl album cover every 3 seconds
  useEffect(() => {
    if (!authModalOpen) return;
    const interval = window.setInterval(() => {
      setCoverIndex((prev) => (prev + 1) % DISC_ALBUM_COVERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [authModalOpen]);

  // Initialize official Google Identity Services
  useEffect(() => {
    if (!authModalOpen) return;

    const clientId = customClientId || userService.getGoogleClientId();

    if (typeof google !== 'undefined' && google.accounts && clientId) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);

                login({
                  id: `google_${payload.sub || Date.now()}`,
                  name: payload.name || payload.given_name || 'Google User',
                  email: payload.email || 'user@gmail.com',
                  avatar:
                    payload.picture ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
                });
                closeAuthModal();
              } catch (e) {
                console.warn('Google JWT parse error:', e);
              }
            }
          },
        });
      } catch (err) {
        console.warn('Google accounts initialization error:', err);
      }
    }
  }, [authModalOpen, customClientId, login, closeAuthModal]);

  if (!authModalOpen) return null;

  const currentCover = DISC_ALBUM_COVERS[coverIndex];

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    userService.setGoogleClientId(customClientId);
    setGoogleAuthNotice('Google Client ID saved! Ready for OAuth.');
    setShowConfig(false);
  };

  const handleGoogleOAuth = () => {
    setIsGoogleLoading(true);
    setGoogleAuthNotice(null);

    const activeClientId = customClientId || userService.getGoogleClientId();

    if (typeof google !== 'undefined' && google.accounts?.oauth2 && activeClientId) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            setIsGoogleLoading(false);
            if (tokenResponse.error) {
              setGoogleAuthNotice(`Google OAuth error: ${tokenResponse.error}`);
              return;
            }
            if (tokenResponse.access_token) {
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userInfoRes.ok) {
                  const googleUser = await userInfoRes.json();
                  login({
                    id: `google_${googleUser.sub}`,
                    name: googleUser.name,
                    email: googleUser.email,
                    avatar:
                      googleUser.picture ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
                  });
                  closeAuthModal();
                  return;
                }
              } catch (fetchErr) {
                console.warn('Error fetching Google userinfo:', fetchErr);
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Token client request error:', err);
      }
    }

    // If no Google Client ID is configured yet, guide user to email login or configure client ID
    setGoogleAuthNotice(
      'Google Client ID not configured. Please use Email/Password authentication or configure your Google Client ID via the settings icon.'
    );
    setIsGoogleLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { user, error } = await userService.signInWithEmail(cleanEmail, password);
        if (error) {
          setAuthError(error);
          setIsSubmitting(false);
          return;
        }
        if (user) {
          login(user);
          closeAuthModal();
        }
      } else {
        const { user, error } = await userService.signUpWithEmail(cleanEmail, password, fullName);
        if (error) {
          setAuthError(error);
          setIsSubmitting(false);
          return;
        }
        if (user) {
          login(user);
          closeAuthModal();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-white/10 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Left Side: Spinning Vinyl Music Disc Showcase */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0c2415] via-[#121212] to-[#1c0f24] p-6 sm:p-8 flex flex-col items-center justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#1DB954]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#8C52FF]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="w-full flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              Vinyl Master Deck
            </span>
            <span className="text-[10px] text-[#B3B3B3] font-semibold">33⅓ RPM</span>
          </div>

          {/* Center Stage: The Spinning Vinyl Music Disc with Changing Covers */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute -top-3 right-2 w-12 h-20 pointer-events-none z-20 origin-top-right transform rotate-12 transition-transform duration-500">
              <div className="w-1.5 h-16 bg-gradient-to-b from-neutral-300 to-neutral-500 rounded-full shadow-lg" />
              <div className="w-3.5 h-4 bg-[#1DB954] rounded-sm absolute bottom-0 -left-1 shadow-[0_0_10px_rgba(29,185,84,0.8)]" />
            </div>

            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2 bg-[#0a0a0a] border-4 border-white/10 shadow-[0_0_50px_rgba(29,185,84,0.25)] flex items-center justify-center">
              <div
                className="w-full h-full rounded-full bg-[#111] relative flex items-center justify-center shadow-2xl animate-spin"
                style={{
                  animationDuration: '6s',
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  backgroundImage: `
                    radial-gradient(circle, transparent 28%, rgba(255,255,255,0.04) 30%, transparent 32%),
                    radial-gradient(circle, transparent 40%, rgba(255,255,255,0.03) 42%, transparent 44%),
                    radial-gradient(circle, transparent 55%, rgba(255,255,255,0.03) 57%, transparent 59%),
                    radial-gradient(circle, transparent 68%, rgba(255,255,255,0.03) 70%, transparent 72%)
                  `,
                }}
              >
                <div className="absolute inset-2 rounded-full border border-white/5" />
                <div className="absolute inset-5 rounded-full border border-white/5" />
                <div className="absolute inset-8 rounded-full border border-white/5" />

                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[3px] border-[#1DB954] shadow-inner flex items-center justify-center bg-[#202020]">
                  <img
                    key={currentCover.title}
                    src={currentCover.image}
                    alt={currentCover.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
                    }}
                    className="w-full h-full object-cover transition-all duration-700 ease-in-out animate-fadeIn"
                  />
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-[#181818] border-2 border-neutral-300 z-10 shadow-md" />
                </div>
              </div>
            </div>
          </div>

          {/* 3-Second Cover Rotation Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 my-1">
            {DISC_ALBUM_COVERS.map((cov, i) => (
              <span
                key={cov.title}
                onClick={() => setCoverIndex(i)}
                className={`transition-all duration-300 cursor-pointer ${
                  i === coverIndex
                    ? 'w-5 h-1.5 rounded-full bg-[#1DB954]'
                    : 'w-1.5 h-1.5 rounded-full bg-white/20 hover:bg-white/50'
                }`}
                title={`${cov.title} • ${cov.artist}`}
              />
            ))}
          </div>

          {/* Bottom Live Info Badge */}
          <div className="w-full text-center space-y-1 relative z-10 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-white">
              <Disc3 className="w-3.5 h-3.5 text-[#1DB954] animate-spin" style={{ animationDuration: '3s' }} />
              <span>{currentCover.title}</span>
              <span className="text-[#B3B3B3]">• {currentCover.artist}</span>
            </div>
            <p className="text-[11px] text-[#B3B3B3]">
              Auto-rotating album vinyl • Changes every 3 seconds
            </p>
          </div>
        </div>

        {/* 2. Right Side: Login & Account Controls */}
        <div className="md:w-7/12 p-6 sm:p-8 space-y-5 flex flex-col justify-center">
          {/* Brand Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="flex items-center bg-[#202020] p-1 rounded-full border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    isLogin ? 'bg-[#1DB954] text-black shadow' : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    !isLogin ? 'bg-[#1DB954] text-black shadow' : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white pt-2">
              {isLogin ? 'Welcome back to AI DJ Studio' : 'Create your Account'}
            </h2>
            <p className="text-xs text-[#B3B3B3]">
              {isLogin
                ? 'Sign in to sync your liked tracks, collaborative rooms, and live chat.'
                : 'Host live listening rooms, chat with friends, and mix tracks across music providers.'}
            </p>
          </div>

          {/* Google OAuth Login Action */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoogleOAuth}
              disabled={isGoogleLoading}
              type="button"
              className="w-full h-11 rounded-full bg-white text-black hover:bg-neutral-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Google Notice */}
            {googleAuthNotice && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] text-xs">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{googleAuthNotice}</span>
              </div>
            )}

            {/* Collapsible Google Cloud Settings */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] text-[#B3B3B3] hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>{showConfig ? 'Hide Google Settings' : 'Google Cloud OAuth Client ID Settings'}</span>
              </button>

              {showConfig && (
                <form onSubmit={handleSaveClientId} className="mt-2 p-3 rounded-xl bg-[#202020] border border-white/10 space-y-2 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Google OAuth Client ID</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1DB954] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Cloud Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="your-id.apps.googleusercontent.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#282828] text-white border border-white/10 text-xs focus:border-[#1DB954] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-[#1DB954] text-black font-bold text-xs hover:bg-[#1ed760] transition-colors cursor-pointer"
                  >
                    Save Google Client ID
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#141414] px-3 text-[11px] text-[#B3B3B3] uppercase tracking-wider font-semibold">
              Or sign in with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {authError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#B3B3B3]">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#202020] text-white placeholder-[#71717A] text-xs sm:text-sm border border-transparent focus:border-[#1DB954] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#B3B3B3]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. account2@gmail.com"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#202020] text-white placeholder-[#71717A] text-xs sm:text-sm border border-transparent focus:border-[#1DB954] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#B3B3B3]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-9 rounded-xl bg-[#202020] text-white placeholder-[#71717A] text-xs sm:text-sm border border-transparent focus:border-[#1DB954] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold text-xs sm:text-sm transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Studio' : 'Create Account & Start Mixing'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
