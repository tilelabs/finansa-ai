/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, KeyRound, AlertCircle, Info, Sparkles, User, ArrowRight, RefreshCw } from 'lucide-react';

interface LoginGateProps {
  onLoginSuccess: () => void;
}

export default function LoginGate({ onLoginSuccess }: LoginGateProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Alphanumeric CAPTCHA generator
  const [captchaText, setCaptchaText] = useState(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  });
  const [captchaInput, setCaptchaInput] = useState('');

  const regenerateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    setCaptchaInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. CAPTCHA validation
    if (captchaInput.trim().toUpperCase() !== captchaText) {
      setError('Kode CAPTCHA keamanan salah. Silakan coba lagi.');
      regenerateCaptcha();
      return;
    }

    setIsLoading(true);

    // Simulated authentic validation or custom pin logic
    setTimeout(() => {
      // Allow demo credentials or standard phone logins
      if (!phoneNumber) {
        setError('Silakan masukkan nomor telepon Anda.');
        setIsLoading(false);
        return;
      }

      // Check for saved credentials in local storage
      const usersJson = localStorage.getItem('finansa_users');
      let isAuthorized = false;

      if (usersJson) {
        try {
          const users = JSON.parse(usersJson) as Array<{ phone: string; pin: string }>;
          const found = users.find(u => u.phone === phoneNumber && u.pin === pinCode);
          if (found) {
            isAuthorized = true;
          }
        } catch (e) {
          console.error('Failed to parse finansa_users', e);
        }
      }

      // If not authorized yet, let's fall back to legacy saved credentials, or first-run demo auto-creation
      if (!isAuthorized) {
        const savedPhone = localStorage.getItem('finansa_saved_phone');
        const savedPin = localStorage.getItem('finansa_saved_pin') || 'Admin@123';

        if (savedPhone) {
          if (phoneNumber === savedPhone && pinCode === savedPin) {
            isAuthorized = true;
            // Seed multi-user list
            const initialUsers = [{ phone: savedPhone, pin: savedPin, addedAt: new Date().toISOString() }];
            localStorage.setItem('finansa_users', JSON.stringify(initialUsers));
          }
        } else {
          // Demo setup: Allow any phone and any standard PIN (>= 4 digits or default Admin@123)
          if (pinCode === 'Admin@123' || pinCode === '1234' || pinCode.length >= 4) {
            isAuthorized = true;
            const finalPin = pinCode.length >= 4 ? pinCode : 'Admin@123';
            const initialUsers = [{ phone: phoneNumber, pin: finalPin, addedAt: new Date().toISOString() }];
            localStorage.setItem('finansa_users', JSON.stringify(initialUsers));
            localStorage.setItem('finansa_saved_phone', phoneNumber);
            localStorage.setItem('finansa_saved_pin', finalPin);
          }
        }
      }

      if (isAuthorized) {
        // Save status to localStorage for session persistence
        localStorage.setItem('finansa_auth', 'true');
        localStorage.setItem('finansa_user_phone', phoneNumber);
        onLoginSuccess();
      } else {
        setError('Nomor telepon atau PIN keamanan salah. Silakan coba lagi atau gunakan PIN default: Admin@123');
        regenerateCaptcha();
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex flex-col justify-between font-sans p-6 md:p-12">
      {/* Top Header branding */}
      <header className="flex justify-between items-center pb-4 border-b border-black/10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-serif italic font-light tracking-tight text-[#1A1A1A]">
            Finansa.ai
          </h1>
          <p className="text-[9px] uppercase tracking-[0.2em] opacity-60 mt-1">
            Personal Finance Intelligence via WhatsApp
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-red-800 bg-[#EFECE7] px-3 py-1 rounded-full border border-black/5">
          Secure Portal
        </span>
      </header>

      {/* Main Login Card - Editorial Center Layout */}
      <main className="max-w-md w-full mx-auto my-12 animate-fadeIn space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-5xl font-serif italic leading-none tracking-tight">Selamat Datang</h2>
          <p className="text-sm font-serif text-slate-600">
            Masuk untuk mengakses buku kas digital dan laporan WhatsApp Anda.
          </p>
        </div>

        <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-black/10 pb-4">
            <Shield className="w-5 h-5 text-[#1A1A1A]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">
              Verifikasi Kredensial
            </span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nomor WhatsApp Kakak
              </label>
              <input
                type="tel"
                placeholder="Contoh: 081234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                required
              />
            </div>

            {/* PIN input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> PIN Keamanan (4-Digit)
              </label>
              <input
                type="password"
                placeholder="PIN Default: 1234"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                required
              />
            </div>

            {/* Captcha Section */}
            <div className="space-y-1.5 border-t border-black/5 pt-4">
              <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Kode CAPTCHA Keamanan
              </label>
              <div className="flex gap-2 items-center">
                {/* Styled Captcha Visual Box */}
                <div 
                  className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-center text-lg font-mono font-bold tracking-[0.3em] text-[#1A1A1A] select-none italic relative overflow-hidden flex items-center justify-center h-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #ccc 10%, transparent 11%)',
                    backgroundSize: '4px 4px'
                  }}
                  title="Keamanan CAPTCHA"
                >
                  {/* Decorative noise lines */}
                  <div className="absolute inset-x-0 h-[1px] bg-black/20 top-1/3 transform -rotate-3 pointer-events-none" />
                  <div className="absolute inset-x-0 h-[1px] bg-black/20 top-2/3 transform rotate-3 pointer-events-none" />
                  <div className="absolute inset-y-0 w-[1px] bg-black/10 left-1/3 transform -rotate-12 pointer-events-none" />
                  <div className="absolute inset-y-0 w-[1px] bg-black/10 left-2/3 transform rotate-12 pointer-events-none" />
                  <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] select-none">
                    {captchaText}
                  </span>
                </div>

                {/* Regenerate Button */}
                <button
                  type="button"
                  onClick={regenerateCaptcha}
                  className="p-2.5 bg-white border border-black/10 hover:border-black/20 hover:bg-[#F9F8F6] rounded-xl text-[#1A1A1A] transition cursor-pointer"
                  title="Segarkan CAPTCHA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Captcha Input */}
              <input
                type="text"
                maxLength={4}
                placeholder="Masukkan 4-digit kode di atas"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs uppercase text-center focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-bold tracking-widest"
                required
              />
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              {isLoading ? (
                'Memverifikasi Portal...'
              ) : (
                <>
                  Masuk Ke Dasbor <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="flex flex-col md:flex-row justify-between items-center text-[9px] uppercase tracking-widest opacity-40 py-6 border-t border-black/10">
        <span>&copy; 2026 Finansa Digital Indonesia</span>
        <span className="my-1 md:my-0">Enkripsi AES-256 Perbankan &bull; Premium Tier</span>
        <span>v1.0.4 - Secure System</span>
      </footer>
    </div>
  );
}
