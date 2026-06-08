import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { register } from '../api/auth';
import { GoogleLogin } from '@react-oauth/google';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, googleLogin } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  // Form state
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(form.username, form.password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('You must accept the Policy of Usage');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await register(form.username, form.email, form.password, form.bio || undefined, avatarFile || undefined);
      // Auto-login after registration
      await login(form.username, form.password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (tab === 'register' && !acceptedTerms) {
      setError('Please accept the Policy of Usage first');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
    setForm({ username: '', email: '', password: '', bio: '' });
    setAvatarPreview(null);
    setAvatarFile(null);
    setAcceptedTerms(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-canvas-bg/90 backdrop-blur-xl" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[32px] border border-canvas-border shadow-2xl w-full max-w-md overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2 bg-canvas-secondary rounded-full hover:bg-canvas-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-10 pt-10 pb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-1">
                {tab === 'login' ? 'Welcome back' : 'Join the collective'}
              </p>
              <h2 className="font-serif text-3xl font-light italic">
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </h2>

              {/* Tabs */}
              <div className="flex mt-6 border-b border-canvas-border">
                {(['login', 'register'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`pb-3 mr-8 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                      tab === t
                        ? 'border-canvas-ink text-canvas-ink'
                        : 'border-transparent text-canvas-ink/40 hover:text-canvas-ink/70'
                    }`}
                  >
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="px-10 pb-10 space-y-5">
              <form
                onSubmit={tab === 'login' ? handleLogin : handleRegister}
                className="space-y-5"
              >
                {tab === 'register' && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-20 h-20 rounded-full bg-canvas-secondary border-2 border-dashed border-canvas-border hover:border-canvas-accent transition-colors overflow-hidden group"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                          <Upload className="w-5 h-5 text-canvas-ink/30 group-hover:text-canvas-accent transition-colors" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-canvas-ink/30">
                            Photo
                          </span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                )}

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                    Username
                  </label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder="e.g. evance_art"
                    className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-canvas-accent transition-colors"
                  />
                </div>

                {tab === 'register' && (
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="artist@studio.com"
                      className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-canvas-accent transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                      placeholder={tab === 'register' ? 'Min. 8 chars, upper, lower, number, symbol' : '••••••••'}
                      className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-canvas-accent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-canvas-ink/30 hover:text-canvas-ink transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {tab === 'register' && (
                  <>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                        Bio <span className="normal-case tracking-normal opacity-60">(optional)</span>
                      </label>
                      <input
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        placeholder="Tell us about your practice..."
                        className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-canvas-accent transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        id="modal-terms"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked) setError(null);
                        }}
                        className="w-4 h-4 rounded border-canvas-border text-canvas-accent focus:ring-canvas-accent cursor-pointer"
                      />
                      <label htmlFor="modal-terms" className="text-[11px] text-canvas-ink/60 cursor-pointer select-none">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowPolicy(true)}
                          className="text-canvas-ink font-bold hover:text-canvas-accent underline transition-colors"
                        >
                          Policy of Usage
                        </button>
                      </label>
                    </div>
                  </>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-canvas-ink text-canvas-bg py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="relative flex items-center gap-4 py-2">
                <div className="h-px bg-canvas-border flex-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-canvas-ink/30">or</span>
                <div className="h-px bg-canvas-border flex-1" />
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google login failed')}
                  useOneTap
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="100%"
                />
              </div>
            </div>
          </motion.div>

          {/* Policy Modal overlay */}
          <AnimatePresence>
            {showPolicy && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-canvas-bg/95 backdrop-blur-2xl"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-[32px] border border-canvas-border shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                >
                  <div className="p-8 border-b border-canvas-border flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-1">Legal</p>
                      <h2 className="font-serif text-3xl font-light italic">Policy of Usage</h2>
                    </div>
                    <button
                      onClick={() => setShowPolicy(false)}
                      className="p-2 bg-canvas-secondary rounded-full hover:bg-canvas-border transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar prose prose-sm max-w-none text-canvas-ink/70 leading-relaxed">
                    <h3 className="text-canvas-ink font-bold mb-4">1. Acceptance of Terms</h3>
                    <p className="mb-6">By creating an account on CANVAS, you agree to abide by these guidelines and terms of service. Our platform is dedicated to fostering a respectful and creative community for artists.</p>
                    
                    <h3 className="text-canvas-ink font-bold mb-4">2. Community Standards</h3>
                    <p className="mb-2">We maintain a zero-tolerance policy for:</p>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                      <li>Harassment or hate speech of any kind.</li>
                      <li>Plagiarism or claiming others' work as your own.</li>
                      <li>Explicit or inappropriate content that violates our aesthetic guidelines.</li>
                      <li>Spam or malicious behavior.</li>
                    </ul>

                    <h3 className="text-canvas-ink font-bold mb-4">3. Content Ownership</h3>
                    <p className="mb-6">You retain full ownership of the artwork you upload. By posting on CANVAS, you grant us a non-exclusive license to display your work within the platform's ecosystem for community viewing and discovery.</p>

                    <h3 className="text-canvas-ink font-bold mb-4">4. Privacy</h3>
                    <p className="mb-6">We value your privacy. Your data is used solely to provide and improve the CANVAS experience. We do not sell your personal information to third parties.</p>

                    <div className="mt-8 p-6 bg-canvas-secondary rounded-2xl border border-canvas-border italic text-xs">
                      Last updated: April 30, 2026. These terms are subject to change as our collective grows.
                    </div>
                  </div>
                  <div className="p-8 border-t border-canvas-border flex justify-end">
                    <button
                      onClick={() => setShowPolicy(false)}
                      className="px-10 py-4 bg-canvas-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all"
                    >
                      I Understand
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

