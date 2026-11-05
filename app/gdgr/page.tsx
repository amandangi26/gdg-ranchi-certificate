'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export default function GDGRAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-[#111] font-sans flex flex-col bg-grid-pattern">
      {/* Header Bar */}
      <header className="w-full bg-[#FFFBF0] border-b-2 border-black sticky top-0 z-50">
        <div className="google-stripe" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0_0_#000]">
              GDG
            </div>
            <span className="font-black text-sm uppercase tracking-tight text-[#111]">
              DevFest Ranchi 2026
            </span>
          </Link>
          <span className="px-3.5 py-1 rounded-full border-2 border-black bg-[#FBBC05] text-[#111] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
            Organizer Console
          </span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8 py-16 sm:py-24">
        <div className="rounded-[28px] sm:rounded-[32px] border-[3.5px] border-black bg-white p-7 sm:p-10 shadow-[8px_8px_0_0_#000] max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center mx-auto shadow-[3px_3px_0_0_#000]">
              <Lock className="w-7 h-7 stroke-[2.5]" />
            </div>
            <span className="text-xs font-black uppercase text-[#4285F4] tracking-[0.1em] block">
              SECURE ORGANIZER ACCESS
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111]">
              Admin Sign In
            </h1>
            <p className="text-xs font-semibold text-[#555]">
              Authorized GDG Ranchi organizers & core team only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gdgranchi.in"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-black bg-[#FFFBF0] font-mono text-sm font-bold text-[#111] placeholder:text-[#999] shadow-[2.5px_2.5px_0_0_#000] focus:border-[#4285F4] focus:shadow-[3px_3px_0_0_#4285F4] focus:bg-white outline-none transition-all"
                  required
                />
                <Mail className="w-5 h-5 text-black absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-black bg-[#FFFBF0] font-mono text-sm font-bold text-[#111] placeholder:text-[#999] shadow-[2.5px_2.5px_0_0_#000] focus:border-[#4285F4] focus:shadow-[3px_3px_0_0_#4285F4] focus:bg-white outline-none transition-all"
                  required
                />
                <Lock className="w-5 h-5 text-black absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3.5px_3.5px_0_0_#000] hover:shadow-[1.5px_1.5px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[3.5px] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Admin Console</span>
              )}
            </button>
          </form>

          {error && (
            <div className="rounded-xl border-2 border-black bg-[#FCE8E6] p-3.5 text-xs font-bold text-[#C5221F] shadow-[2px_2px_0_0_#000] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#666] hover:text-[#111] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Certificate Portal</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

