import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

export const SignInPage: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate('/'); // Redirect to home or dashboard after successful login
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);
    try {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-canvas-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[32px] border border-canvas-border shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-10 pt-10 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-1">
            Welcome back
          </p>
          <h2 className="font-serif text-3xl font-light italic">
            Sign In
          </h2>
        </div>

        {/* Form */}
        <div className="px-10 pb-10 space-y-5">
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
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
                  autoComplete="current-password"
                  placeholder="••••••••"
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
              Sign In
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

          <p className="text-center text-sm text-canvas-ink/70">
            Don't have an account?{' '}
            <Link to="/signup" className="text-canvas-accent hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};