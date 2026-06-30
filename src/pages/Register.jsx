import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register');
  const [otp, setOtp] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep('otp');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode: otp });
      base44.auth.setToken(res.access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid code.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try { await base44.auth.resendOtp(email); } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-xl font-bold text-slate-900">
            {step === 'register' ? 'Create an Account' : 'Verify Email'}
          </h1>
        </div>
        {step === 'register' ? (
          <>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="confirm">Confirm Password</Label><Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</Button>
            </form>
            <Button variant="outline" onClick={() => base44.auth.loginWithProvider('google', '/')} className="w-full cursor-pointer">Continue with Google</Button>
            <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="text-slate-900 font-medium hover:underline cursor-pointer">Sign in</Link></p>
          </>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500 text-center">We sent a code to <strong>{email}</strong></p>
            <div className="space-y-2"><Label htmlFor="otp">Verification Code</Label><Input id="otp" value={otp} onChange={e => setOtp(e.target.value)} required /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? 'Verifying…' : 'Verify'}</Button>
            <button type="button" onClick={handleResend} className="text-sm text-slate-500 hover:underline w-full text-center cursor-pointer">Resend code</button>
          </form>
        )}
      </div>
    </div>
  );
}