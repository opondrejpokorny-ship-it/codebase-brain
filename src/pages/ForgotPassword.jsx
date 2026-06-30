import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-xl font-bold text-slate-900">Reset Password</h1>
        </div>
        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">If an account exists for that email, we sent a reset link.</p>
            <Link to="/login" className="text-sm text-slate-900 font-medium hover:underline cursor-pointer">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</Button>
            <Link to="/login" className="text-sm text-slate-500 hover:underline block text-center cursor-pointer">Back to Sign In</Link>
          </form>
        )}
      </div>
    </div>
  );
}