import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = '/login';
    } catch (err) {
      setError(err?.response?.data?.detail || 'Reset failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-xl font-bold text-slate-900">New Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="password">New Password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="confirm">Confirm Password</Label><Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</Button>
        </form>
      </div>
    </div>
  );
}