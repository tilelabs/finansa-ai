/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  KeyRound, 
  Smartphone, 
  Check, 
  AlertCircle, 
  UserPlus, 
  Trash2, 
  UserCheck, 
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserItem {
  phone: string;
  pin: string;
  addedAt?: string;
}

interface AccessSettingsProps {
  onCredentialsChanged?: () => void;
}

// Helper function to validate password complexity: minimum 6 characters/digits, containing letters, numbers, and special characters.
export function validatePasswordComplexity(password: string): { isValid: boolean; message: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password/PIN harus memiliki minimal 6 karakter.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  // Special characters are non-alphanumeric (like symbols, spaces, punctuation)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLetter || !hasDigit || !hasSpecial) {
    return {
      isValid: false,
      message: 'Password/PIN harus dikombinasikan dari huruf (a-z, A-Z), angka (0-9), dan karakter khusus/simbol (seperti @, #, $, !, %, dll).'
    };
  }

  return { isValid: true, message: '' };
}

export default function AccessSettings({ onCredentialsChanged }: AccessSettingsProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  
  // New User Form States
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');

  // Change PIN Form States for active user
  const [myOldPin, setMyOldPin] = useState('');
  const [myNewPin, setMyNewPin] = useState('');
  const [myConfirmPin, setMyConfirmPin] = useState('');
  
  // Settings / Status States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPins, setShowPins] = useState<{ [key: string]: boolean }>({});
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => {
    // Get currently logged-in user phone
    const activePhone = localStorage.getItem('finansa_user_phone') || '';
    setCurrentUserPhone(activePhone);

    // Load users list
    const usersJson = localStorage.getItem('finansa_users');
    let loadedUsers: UserItem[] = [];

    if (usersJson) {
      try {
        loadedUsers = JSON.parse(usersJson);
      } catch (e) {
        console.error('Error parsing finansa_users', e);
      }
    }

    // If empty or null, seed with legacy or default values to ensure continuity
    if (loadedUsers.length === 0) {
      const savedPhone = localStorage.getItem('finansa_saved_phone') || activePhone || '081234567890';
      const savedPin = localStorage.getItem('finansa_saved_pin') || 'Admin@123';
      loadedUsers = [
        {
          phone: savedPhone,
          pin: savedPin,
          addedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('finansa_users', JSON.stringify(loadedUsers));
    }

    setUsers(loadedUsers);
  }, []);

  // Toggle PIN visibility for specific users
  const togglePinVisibility = (phone: string) => {
    setShowPins(prev => ({
      ...prev,
      [phone]: !prev[phone]
    }));
  };

  // Add new user handler
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedPhone = newPhone.trim();
    const trimmedPin = newPin.trim();

    // Validations
    if (!trimmedPhone) {
      setError('Nomor WhatsApp tidak boleh kosong.');
      return;
    }

    if (!/^\d+$/.test(trimmedPhone)) {
      setError('Nomor WhatsApp harus berupa angka saja (Contoh: 0812345678).');
      return;
    }

    const validation = validatePasswordComplexity(trimmedPin);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    // Check if user already exists
    const userExists = users.some(u => u.phone === trimmedPhone);
    if (userExists) {
      setError(`Nomor WhatsApp ${trimmedPhone} sudah terdaftar.`);
      return;
    }

    // Add user to array
    const updatedUsers = [
      ...users,
      {
        phone: trimmedPhone,
        pin: trimmedPin,
        addedAt: new Date().toISOString()
      }
    ];

    // Save and update state
    localStorage.setItem('finansa_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    // Reset form fields
    setNewPhone('');
    setNewPin('');
    setSuccess(`Pengguna baru ${trimmedPhone} berhasil ditambahkan!`);

    if (onCredentialsChanged) {
      onCredentialsChanged();
    }
  };

  // Delete user handler
  const handleDeleteUser = (phoneToDelete: string) => {
    setError('');
    setSuccess('');

    // Security check: cannot delete currently logged in session
    if (phoneToDelete === currentUserPhone) {
      setError('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus akses untuk pengguna ${phoneToDelete}?`)) {
      const updatedUsers = users.filter(u => u.phone !== phoneToDelete);
      localStorage.setItem('finansa_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      setSuccess(`Pengguna ${phoneToDelete} berhasil dihapus.`);

      if (onCredentialsChanged) {
        onCredentialsChanged();
      }
    }
  };

  // Change active logged-in user PIN handler
  const handleChangeMyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsChangingPin(true);

    setTimeout(() => {
      // Find current user's record
      const me = users.find(u => u.phone === currentUserPhone);
      if (!me) {
        setError('Sesi pengguna Anda tidak valid atau tidak ditemukan dalam sistem.');
        setIsChangingPin(false);
        return;
      }

      // Check current PIN matches old PIN input
      if (me.pin !== myOldPin) {
        setError('PIN Lama yang Anda masukkan tidak sesuai.');
        setIsChangingPin(false);
        return;
      }

      // Validate new PIN complexity
      const validation = validatePasswordComplexity(myNewPin);
      if (!validation.isValid) {
        setError(validation.message);
        setIsChangingPin(false);
        return;
      }

      // Check confirm PIN
      if (myNewPin !== myConfirmPin) {
        setError('Konfirmasi PIN Baru tidak cocok.');
        setIsChangingPin(false);
        return;
      }

      // Modify the pin inside users array
      const updatedUsers = users.map(u => {
        if (u.phone === currentUserPhone) {
          return { ...u, pin: myNewPin };
        }
        return u;
      });

      // Save to localStorage
      localStorage.setItem('finansa_users', JSON.stringify(updatedUsers));
      localStorage.setItem('finansa_saved_pin', myNewPin);
      setUsers(updatedUsers);

      // Clear states
      setMyOldPin('');
      setMyNewPin('');
      setMyConfirmPin('');
      setSuccess('PIN Keamanan Anda berhasil dirubah!');
      setIsChangingPin(false);

      if (onCredentialsChanged) {
        onCredentialsChanged();
      }
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 shadow-sm">
        <div className="border-b border-black/10 pb-6">
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1 font-mono">Panel Manajemen Akses</p>
          <h2 className="text-3xl font-serif italic font-light text-[#1A1A1A] flex items-center gap-2">
            Kelola Akses Pengguna & PIN
          </h2>
          <p className="text-xs text-[#1A1A1A]/70 mt-2">
            Sebagai Administrator, Anda dapat menambahkan pengguna baru atau menghapus akses pengguna dari sistem ini. Setiap pengguna memerlukan nomor WhatsApp terdaftar dan password/PIN minimal 6 karakter yang menggabungkan huruf, angka, dan karakter khusus.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <div className="bg-white/50 border border-black/5 rounded-2xl p-4 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-green-700 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 block">Sesi Masuk Aktif</span>
              <span className="font-mono font-bold text-[#1A1A1A]">{currentUserPhone}</span>
            </div>
          </div>
          <div className="bg-white/50 border border-black/5 rounded-2xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 block">Total Pengguna Terdaftar</span>
              <span className="font-mono font-bold text-[#1A1A1A]">{users.length} Akun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 text-xs rounded-2xl border border-red-200 flex items-center gap-2.5 max-w-4xl mx-auto">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2.5 max-w-4xl mx-auto">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Grid Layout: Left List, Right Add */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User List Panel */}
        <div className="lg:col-span-7 bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif italic text-[#1A1A1A]">Daftar Pengguna Aktif</h3>
            <p className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider mt-1">Daftar semua orang yang memiliki akses login</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 text-[10px] uppercase tracking-wider text-[#1A1A1A]/50">
                  <th className="py-3 font-semibold">Nomor WhatsApp</th>
                  <th className="py-3 font-semibold">PIN Keamanan</th>
                  <th className="py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((user) => {
                  const isSelf = user.phone === currentUserPhone;
                  const pinShown = showPins[user.phone] || false;

                  return (
                    <tr key={user.phone} className="text-xs hover:bg-white/10 transition duration-150">
                      <td className="py-4 font-mono font-medium flex items-center gap-1.5">
                        <span>{user.phone}</span>
                        {isSelf && (
                          <span className="text-[8px] uppercase tracking-widest font-bold bg-green-800/10 text-green-800 px-2 py-0.5 rounded-full border border-green-800/20">
                            Anda
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{pinShown ? user.pin : '••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(user.phone)}
                            className="p-1 text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition cursor-pointer"
                            title={pinShown ? "Sembunyikan PIN" : "Tampilkan PIN"}
                          >
                            {pinShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.phone)}
                          disabled={isSelf}
                          className={`p-2 rounded-xl transition inline-flex items-center gap-1 cursor-pointer ${
                            isSelf
                              ? 'text-black/20 bg-black/5 cursor-not-allowed'
                              : 'text-red-700 hover:text-red-950 hover:bg-red-50 border border-red-200/20'
                          }`}
                          title={isSelf ? "Tidak bisa menghapus diri sendiri" : `Hapus user ${user.phone}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[9px] uppercase font-bold tracking-wider">Hapus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-[#1A1A1A]/40 bg-white/30 border border-black/5 rounded-xl p-3 leading-relaxed">
            * Demi keamanan portal, Anda tidak dapat menghapus nomor WhatsApp Anda sendiri yang saat ini Anda gunakan untuk masuk.
          </div>
        </div>

        {/* Add User Panel */}
        <div className="lg:col-span-5 bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif italic text-[#1A1A1A]">Tambah Pengguna</h3>
            <p className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider mt-1">Daftarkan akses baru untuk partner Anda</p>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4">
            {/* Phone Number Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Nomor WhatsApp Baru
              </label>
              <input
                type="tel"
                placeholder="Contoh: 081234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                required
              />
            </div>

            {/* PIN Code Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Password/PIN Baru
              </label>
              <input
                type="password"
                maxLength={32}
                placeholder="Masukkan password/PIN baru"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow mt-2"
            >
              <UserPlus className="w-4 h-4" /> Daftarkan Pengguna
            </button>
          </form>

          {/* Quick Notice */}
          <div className="bg-[#1A1A1A] text-[#F9F8F6] rounded-xl p-4 space-y-2 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-300 block text-[9px] uppercase tracking-wider">Tips Keamanan</span>
            <p className="opacity-80">
              Kata Sandi/PIN wajib minimal 6 karakter serta mengombinasikan huruf, angka, dan karakter khusus/simbol.
            </p>
          </div>
        </div>
      </div>

      {/* Change PIN Form Section */}
      <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <KeyRound className="w-5 h-5 text-[#1A1A1A]" />
          <div>
            <h3 className="text-xl font-serif italic text-[#1A1A1A]">Ubah PIN Keamanan Saya</h3>
            <p className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider mt-0.5">Ubah sandi/PIN login untuk nomor {currentUserPhone}</p>
          </div>
        </div>

        <form onSubmit={handleChangeMyPin} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Old PIN */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1A1A1A]/60" /> Password/PIN Lama
            </label>
            <input
              type="password"
              maxLength={32}
              placeholder="Masukkan PIN saat ini"
              value={myOldPin}
              onChange={(e) => setMyOldPin(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
              required
            />
          </div>

          {/* New PIN */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1A1A1A]/60" /> PIN/Password Baru
            </label>
            <input
              type="password"
              maxLength={32}
              placeholder="Kombinasi huruf, angka & simbol (Min. 6 karakter)"
              value={myNewPin}
              onChange={(e) => setMyNewPin(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
              required
            />
          </div>

          {/* Confirm PIN */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1A1A1A]/60" /> Konfirmasi PIN/Password Baru
            </label>
            <input
              type="password"
              maxLength={32}
              placeholder="Ulangi PIN/Password baru"
              value={myConfirmPin}
              onChange={(e) => setMyConfirmPin(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
              required
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPin}
              className="w-full md:w-auto px-6 py-3.5 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow min-w-[200px]"
            >
              {isChangingPin ? 'Memperbarui PIN...' : 'Ubah PIN Saya Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
