/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Settings, Wallet, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { Transaction } from './types';
import WhatsAppChat from './components/WhatsAppChat';
import FinancialDashboard from './components/FinancialDashboard';
import WebhookSetup from './components/WebhookSetup';
import DateReport from './components/DateReport';
import LoginGate from './components/LoginGate';
import AccessSettings from './components/AccessSettings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userPhone, setUserPhone] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'whatsapp' | 'guide' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Check auth session on startup
  useEffect(() => {
    const auth = localStorage.getItem('finansa_auth');
    const phone = localStorage.getItem('finansa_user_phone');
    if (auth === 'true' && phone) {
      setIsAuthenticated(true);
      setUserPhone(phone);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const phone = localStorage.getItem('finansa_user_phone') || '';
    setUserPhone(phone);
    loadTransactions();
  };

  const handleLogout = () => {
    localStorage.removeItem('finansa_auth');
    localStorage.removeItem('finansa_user_phone');
    setIsAuthenticated(false);
    setUserPhone('');
  };

  // Fetch transactions from server DB
  const loadTransactions = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTransactions(data.transactions);
        } else {
          setLoadError('Gagal memuat daftar transaksi dari basis data.');
        }
      } else {
        setLoadError('Gagal menghubungi server basis data.');
      }
    } catch (err) {
      setLoadError('Terjadi kesalahan koneksi internet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create manual transaction
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Instantly refresh list
          await loadTransactions();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update local state directly for responsive feedback
          setTransactions((prev) => prev.filter((t) => t.id !== id));
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('finansa_auth');
    if (auth === 'true') {
      loadTransactions();
    }
  }, []);

  if (!isAuthenticated) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex flex-col font-sans">
      {/* Top Main Navigation Bar - Editorial Aesthetic */}
      <header className="bg-[#F9F8F6] border-b border-[#1A1A1A] sticky top-0 z-30 pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            {/* Logo */}
            <div className="flex flex-col">
              <h1 className="text-4xl font-serif italic font-light tracking-tight text-[#1A1A1A]">
                Finansa.ai 🤖
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 mt-1">
                Personal Finance Ai
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-2 border-t md:border-t-0 pt-2 md:pt-0 border-black/10 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition duration-200 rounded-full shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5'
                }`}
              >
                Dasbor
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition duration-200 rounded-full shrink-0 ${
                  activeTab === 'reports'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5'
                }`}
              >
                Laporan
              </button>

              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition duration-200 rounded-full shrink-0 ${
                  activeTab === 'whatsapp'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5'
                }`}
              >
                Simulasi
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition duration-200 rounded-full shrink-0 ${
                  activeTab === 'guide'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5'
                }`}
              >
                Panduan
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition duration-200 rounded-full shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5'
                }`}
              >
                Pengaturan PIN
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs uppercase tracking-widest font-bold transition duration-200 rounded-full shrink-0 text-red-600 hover:bg-red-50 hover:text-red-800 flex items-center gap-1.5 border border-red-600/20 hover:border-red-600/40 cursor-pointer shadow-sm"
                title={`Keluar dari sesi ${userPhone}`}
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loadError && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-xl border border-red-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              onClick={loadTransactions}
              className="p-1.5 hover:bg-red-100 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4 text-red-800" />
            </button>
          </div>
        )}

        {/* Tab view switching */}
        {isLoading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-[#1A1A1A] animate-spin" />
            <p className="text-slate-500 font-medium text-sm font-serif italic">Menyiapkan buku kas keuangan harian Kakak...</p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {activeTab === 'dashboard' && (
              <FinancialDashboard
                transactions={transactions}
                onRefresh={loadTransactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'reports' && (
              <DateReport transactions={transactions} />
            )}

            {activeTab === 'whatsapp' && (
              <WhatsAppChat onTransactionLogged={loadTransactions} />
            )}

            {activeTab === 'guide' && <WebhookSetup />}

            {activeTab === 'settings' && (
              <AccessSettings onCredentialsChanged={() => {
                const phone = localStorage.getItem('finansa_user_phone') || '';
                setUserPhone(phone);
              }} />
            )}
          </div>
        )}
      </main>

      {/* Beautiful human-centered footer */}
      <footer className="mt-auto flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest opacity-40 py-6 border-t border-black/10 px-8">
        <span>&copy; 2026 Finansa Digital Indonesia</span>
        <span className="my-1 md:my-0">Ditenagai Google Gemini 3.5 & Node.js Express</span>
        <span>Enkripsi AES-256 Perbankan &bull; Premium Tier</span>
      </footer>
    </div>
  );
}
