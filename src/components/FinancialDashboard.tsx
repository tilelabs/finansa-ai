/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  FileText,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { jsPDF } from 'jspdf';

interface FinancialDashboardProps {
  transactions: Transaction[];
  onRefresh: () => void;
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
}

export default function FinancialDashboard({
  transactions,
  onRefresh,
  onAddTransaction,
  onDeleteTransaction
}: FinancialDashboardProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'whatsapp' | 'manual'>('all');

  // Manual Transaction Form Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Makanan');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active chart hover tooltip state
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Categories list
  const CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Gaji', 'Freelance', 'Hiburan', 'Lain-lain'];

  // Calculate high-level stat totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Format currency helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filter transactions based on UI selections
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSource =
      filterSource === 'all' ||
      (filterSource === 'whatsapp' && (t.source === 'whatsapp' || t.source === 'whatsapp_simulated')) ||
      (filterSource === 'manual' && t.source === 'manual');

    return matchesSearch && matchesType && matchesCategory && matchesSource;
  });

  // Calculate Monthly Trend Data (Last 30 Days)
  const getMonthlyTrend = () => {
    const data: { dayName: string; shortDate: string; income: number; expense: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = String(d.getDate()); // Just the date number to save space
      const shortDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      // Sum values for this specific date
      const daysTxs = transactions.filter((t) => t.date.split('T')[0] === dateStr);
      const income = daysTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = daysTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      data.push({ dayName, shortDate, income, expense });
    }
    return data;
  };

  const monthlyTrendData = getMonthlyTrend();

  // Find max value in monthly trend to scale SVG height
  const maxMonthlyVal = Math.max(...monthlyTrendData.map((d) => Math.max(d.income, d.expense, 50000)));

  // Calculate Category Breakdowns
  const getCategoryBreakdown = () => {
    const breakdown: { [key: string]: number } = {};
    // Seed all categories with 0
    CATEGORIES.forEach((cat) => {
      breakdown[cat] = 0;
    });

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });

    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const categoryData = getCategoryBreakdown();
  const maxCategoryVal = Math.max(...categoryData.map((c) => c.amount), 1);

  // Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      setErrorMessage('Nominal harus berupa angka valid di atas 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAddTransaction({
        type: newType,
        amount: Number(newAmount),
        category: newCategory,
        description: newDesc.trim() || (newType === 'income' ? 'Pemasukan Manual' : 'Pengeluaran Manual'),
        date: newDate,
        source: 'manual'
      });

      if (success) {
        setShowAddModal(false);
        // Reset state values
        setNewAmount('');
        setNewDesc('');
        setNewDate(new Date().toISOString().split('T')[0]);
      } else {
        setErrorMessage('Gagal menambahkan transaksi. Coba lagi.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) {
      await onDeleteTransaction(id);
    }
  };

  // GENERATE PDF REPORT
  const generatePDFReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color definitions
    const primaryColor = [16, 185, 129]; // Emerald 500 (emerald green)
    const charcoalColor = [30, 41, 59]; // Slate 800
    const lightBg = [248, 250, 252]; // Slate 50
    const textMuted = [100, 116, 139]; // Slate 500

    // Set document properties
    doc.setProperties({
      title: 'Laporan Keuangan CatatKeuangan Bot',
      subject: 'Rekap Transaksi Mingguan & Bulanan',
      author: 'CatatKeuangan Bot',
      creator: 'Google AI Studio Applet'
    });

    // 1. Header banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Title text inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CATATKEUANGAN BOT', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Laporan Ringkasan Keuangan Harian & Bulanan Otomatis', 15, 25);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 31);

    // 2. Summary Grid (Income, Expenses, Net Balance)
    const gridY = 50;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(15, gridY, 180, 30, 3, 3, 'F');

    // Stats Headers
    doc.setFontSize(9);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('TOTAL PEMASUKAN', 25, gridY + 8);
    doc.text('TOTAL PENGELUARAN', 85, gridY + 8);
    doc.text('SALDO NETO (BERSIH)', 145, gridY + 8);

    // Stats Values
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green for income
    doc.text(formatRupiah(totalIncome), 25, gridY + 18);

    doc.setTextColor(239, 68, 68); // Red for expense
    doc.text(formatRupiah(totalExpense), 85, gridY + 18);

    const isPositive = netBalance >= 0;
    doc.setTextColor(isPositive ? 16 : 239, isPositive ? 185 : 68, isPositive ? 129 : 68);
    doc.text(formatRupiah(netBalance), 145, gridY + 18);

    // 3. Category Summary Breakdown
    doc.setFontSize(14);
    doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Pengeluaran per Kategori', 15, 93);

    let catY = 101;
    doc.setFontSize(10);
    categoryData.slice(0, 5).forEach((item) => {
      if (item.amount > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
        doc.text(item.category, 15, catY);

        // Simple text-based visual loading bar representing shares
        const percent = Math.round((item.amount / maxCategoryVal) * 100);
        const barChars = '='.repeat(Math.ceil(percent / 10)) + '-'.repeat(10 - Math.ceil(percent / 10));
        doc.setTextColor(150, 150, 150);
        doc.setFont('courier', 'normal');
        doc.text(`[${barChars}] ${percent}%`, 70, catY);

        doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(formatRupiah(item.amount), 150, catY);

        catY += 8;
      }
    });

    if (catY === 101) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Belum ada data pengeluaran tercatat untuk dikelompokkan.', 15, 101);
      catY += 8;
    }

    // 4. Transaction List Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
    doc.text('Daftar Transaksi Lengkap', 15, catY + 8);

    const tableY = catY + 14;
    // Draw table headers
    doc.setFillColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
    doc.rect(15, tableY, 180, 8, 'F');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TANGGAL', 18, tableY + 5);
    doc.text('KATEGORI', 43, tableY + 5);
    doc.text('DESKRIPSI', 75, tableY + 5);
    doc.text('SUMBER', 133, tableY + 5);
    doc.text('NOMINAL', 165, tableY + 5);

    // Populate rows
    let rowY = tableY + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    filteredTransactions.slice(0, 15).forEach((t, index) => {
      // Background shading for alternating rows
      if (index % 2 === 1) {
        doc.setFillColor(245, 247, 250);
        doc.rect(15, rowY, 180, 7.5, 'F');
      }

      doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
      const dateFormatted = new Date(t.date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
      doc.text(dateFormatted, 18, rowY + 5);
      doc.text(t.category, 43, rowY + 5);

      // Truncate long descriptions
      const descText = t.description.length > 30 ? t.description.substring(0, 27) + '...' : t.description;
      doc.text(descText, 75, rowY + 5);

      // Label source nicely
      const sourceLabel = t.source.startsWith('whatsapp') ? 'WhatsApp' : 'Manual';
      doc.text(sourceLabel, 133, rowY + 5);

      // Colored amount columns
      if (t.type === 'income') {
        doc.setTextColor(16, 185, 129); // Emerald green for plus
        doc.setFont('helvetica', 'bold');
        doc.text(`+ ${formatRupiah(t.amount)}`, 165, rowY + 5);
      } else {
        doc.setTextColor(239, 68, 68); // Red for minus
        doc.setFont('helvetica', 'normal');
        doc.text(`- ${formatRupiah(t.amount)}`, 165, rowY + 5);
      }

      rowY += 7.5;
    });

    if (filteredTransactions.length === 0) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('helvetica', 'italic');
      doc.text('Tidak ada catatan keuangan yang sesuai filter.', 18, rowY + 6);
    }

    // Footnote
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan ini diunduh otomatis dari dasbor WhatsApp Financial Chatbot Tracker.', 15, 280);
    doc.text('Halaman 1 / 1', 180, 280);

    // Trigger save download
    doc.save(`Laporan_Keuangan_CatatKeuangan_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Cards Grid - Editorial Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Saldo */}
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[180px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Saldo Utama Neto</p>
            <h2 className="text-4xl font-serif italic font-light text-[#1A1A1A] mt-3 tracking-tight">
              {formatRupiah(netBalance)}
            </h2>
          </div>
          <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider opacity-50">Status Kas</span>
            <span
              className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full ${
                netBalance >= 0 ? 'bg-green-800 text-white' : 'bg-red-800 text-white'
              }`}
            >
              {netBalance >= 0 ? 'Surplus (Aman)' : 'Defisit (Bahaya)'}
            </span>
          </div>
        </div>

        {/* Card 2: Pemasukan */}
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[180px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Total Pemasukan</p>
            <h2 className="text-4xl font-serif text-green-800 font-light mt-3 tracking-tight">
              {formatRupiah(totalIncome)}
            </h2>
          </div>
          <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider opacity-50">Sumber Terakumulasi</span>
            <span className="text-[10px] text-green-800 font-bold uppercase tracking-wider">Aktif</span>
          </div>
        </div>

        {/* Card 3: Pengeluaran */}
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[180px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Total Pengeluaran</p>
            <h2 className="text-4xl font-serif text-red-800 font-light mt-3 tracking-tight">
              {formatRupiah(totalExpense)}
            </h2>
          </div>
          <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider opacity-50">Kebutuhan Terkuras</span>
            <span className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Tercatat</span>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart 1: Interactive Monthly Trend */}
        <div className="lg:col-span-7 bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Aliran Dana Bulanan</p>
              <h3 className="text-2xl font-serif italic text-[#1A1A1A] mt-1">Tren 30 Hari Terakhir</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider bg-white/60 border border-black/5 font-bold px-3 py-1 rounded-full text-[#1A1A1A]">
              30 Hari
            </span>
          </div>

          {/* SVG Line & Bar Representation */}
          <div className="relative flex-1 min-h-[220px] flex items-end justify-between px-1 pt-6">
            {/* Gridlines */}
            <div className="absolute inset-x-0 top-1/4 border-t border-black/5 pointer-events-none" />
            <div className="absolute inset-x-0 top-2/4 border-t border-black/5 pointer-events-none" />
            <div className="absolute inset-x-0 top-3/4 border-t border-black/5 pointer-events-none" />

            {monthlyTrendData.map((day, idx) => {
              // Scale heights nicely (min 4px, max 130px)
              const incHeight = maxMonthlyVal > 0 ? (day.income / maxMonthlyVal) * 130 + 4 : 4;
              const expHeight = maxMonthlyVal > 0 ? (day.expense / maxMonthlyVal) * 130 + 4 : 4;

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 group cursor-pointer relative z-10"
                  onMouseEnter={() => setHoveredDayIndex(idx)}
                  onMouseLeave={() => setHoveredDayIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {hoveredDayIndex === idx && (
                    <div className="absolute -top-16 bg-[#1A1A1A] text-[#F9F8F6] text-[11px] rounded-xl p-3 shadow-xl z-50 pointer-events-none min-w-[150px] text-center border border-black/10 font-sans">
                      <p className="font-bold font-serif italic border-b border-white/20 pb-1 mb-1">{day.shortDate}</p>
                      <p className="text-green-300 flex items-center justify-between gap-2">
                        <span>Pemasukan:</span> <span className="font-mono">{formatRupiah(day.income)}</span>
                      </p>
                      <p className="text-red-300 flex items-center justify-between gap-2">
                        <span>Pengeluaran:</span> <span className="font-mono">{formatRupiah(day.expense)}</span>
                      </p>
                    </div>
                  )}

                  {/* Dual Bars representation */}
                  <div className="flex gap-0.5 items-end h-[140px] w-full justify-center">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${incHeight}px` }}
                      className={`w-1 md:w-1.5 rounded-t-sm transition-all duration-300 ${
                        hoveredDayIndex === idx
                          ? 'bg-green-800 shadow-md'
                          : 'bg-green-800/40'
                      }`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expHeight}px` }}
                      className={`w-1 md:w-1.5 rounded-t-sm transition-all duration-300 ${
                        hoveredDayIndex === idx
                          ? 'bg-[#1A1A1A] shadow-md'
                          : 'bg-[#1A1A1A]/40'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[8px] font-mono uppercase tracking-widest text-[#1A1A1A] opacity-50 mt-3">{day.dayName}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 justify-center mt-6 pt-4 border-t border-black/10 text-[10px] uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5 text-[#1A1A1A]">
              <span className="w-3 h-3 rounded-sm bg-green-800/80 inline-block" /> Pemasukan
            </span>
            <span className="flex items-center gap-1.5 text-[#1A1A1A]">
              <span className="w-3 h-3 rounded-sm bg-[#1A1A1A]/80 inline-block" /> Pengeluaran
            </span>
          </div>
        </div>

        {/* Chart 2: Category Expenses Share */}
        <div className="lg:col-span-5 bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-50">Distribusi Kategori</p>
                <h3 className="text-2xl font-serif italic text-[#1A1A1A] mt-1">Proporsi Belanja</h3>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-widest bg-red-800 text-white px-2.5 py-1 rounded-full">
                Sektor
              </span>
            </div>
            <p className="text-xs text-[#1A1A1A]/60 mb-6">Persentase pengeluaran harian Kakak berdasarkan kategori teratas</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {categoryData.slice(0, 5).map((item, idx) => {
              const percentage = totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0;
              // Classy monochrome/editorial opacities
              const opacityClasses = [
                'bg-[#1A1A1A]',
                'bg-[#1A1A1A]/85',
                'bg-[#1A1A1A]/70',
                'bg-[#1A1A1A]/50',
                'bg-[#1A1A1A]/30'
              ];

              return (
                <div
                  key={idx}
                  className="space-y-1.5 group cursor-pointer"
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="flex items-center justify-between text-xs text-[#1A1A1A] font-medium">
                    <span className="group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-1 font-serif italic">
                      {idx + 1}. {item.category}
                    </span>
                    <span className="font-mono text-[11px] font-bold">
                      {formatRupiah(item.amount)} ({percentage}%)
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${opacityClasses[idx % opacityClasses.length]}`}
                    />
                  </div>
                </div>
              );
            })}

            {transactions.filter((t) => t.type === 'expense').length === 0 && (
              <div className="text-center py-8 text-[#1A1A1A]/40 italic text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-black/10 rounded-2xl">
                <AlertCircle className="w-6 h-6 opacity-40" />
                <span>Belum ada data pengeluaran tercatat.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Ledger section */}
      <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 space-y-6 shadow-sm">
        {/* Table Controls (Search, Filters, Action buttons) */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pb-4 border-b border-black/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-50">Buku Kas Utama</p>
            <h3 className="text-3xl font-serif text-[#1A1A1A] mt-1">Daftar Transaksi Lengkap</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Download PDF button */}
            <button
              onClick={generatePDFReport}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 px-6 py-3 rounded-full font-bold transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Laporan PDF
            </button>

            {/* Manual entry button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest bg-white text-[#1A1A1A] hover:bg-white/80 border border-black/10 px-6 py-3 rounded-full font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Catat Manual
            </button>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              className="p-3 bg-white/60 hover:bg-white/80 border border-black/5 text-[#1A1A1A]/70 rounded-full transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Panel - Clean Editorial Outline Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#1A1A1A]/40" />
            <input
              type="text"
              placeholder="Cari deskripsi / kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/70 border border-black/10 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 font-medium"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-white/70 border border-black/10 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-[#1A1A1A]/40 mr-2" />
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:outline-none text-[#1A1A1A] font-medium"
            >
              <option value="all">Semua Tipe</option>
              <option value="income">🟢 Hanya Pemasukan</option>
              <option value="expense">🔴 Hanya Pengeluaran</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center bg-white/70 border border-black/10 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-[#1A1A1A]/40 mr-2" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:outline-none text-[#1A1A1A] font-medium"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center bg-white/70 border border-black/10 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-[#1A1A1A]/40 mr-2" />
            <select
              value={filterSource}
              onChange={(e: any) => setFilterSource(e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:outline-none text-[#1A1A1A] font-medium"
            >
              <option value="all">Semua Sumber</option>
              <option value="whatsapp">📱 Pesan WhatsApp</option>
              <option value="manual">✍️ Catat Manual</option>
            </select>
          </div>
        </div>

        {/* Ledger Table - High-Contrast Editorial Style */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#1A1A1A] text-[9px] font-bold text-white uppercase tracking-widest">
                <th className="p-4 pl-6">Tanggal</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Keterangan / Kunci Transaksi</th>
                <th className="p-4">Sumber</th>
                <th className="p-4">Nominal</th>
                <th className="p-4 pr-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-xs text-[#1A1A1A] font-medium">
              {filteredTransactions.map((tx) => {
                const dateFormatted = new Date(tx.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <tr key={tx.id} className="hover:bg-white/40 transition">
                    <td className="p-4 pl-6 whitespace-nowrap font-mono tracking-tight">{dateFormatted}</td>
                    <td className="p-4">
                      <span className="inline-block bg-white border border-black/5 text-[#1A1A1A]/80 text-[10px] tracking-wider uppercase font-bold px-3 py-1 rounded-full">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-[#1A1A1A] font-serif italic text-sm">{tx.description}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {tx.source.startsWith('whatsapp') ? (
                        <span className="inline-flex items-center gap-1 text-green-800 bg-white/80 px-2.5 py-1 rounded-full text-[10px] border border-black/5 font-bold uppercase tracking-wider">
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-800 bg-white/80 px-2.5 py-1 rounded-full text-[10px] border border-black/5 font-bold uppercase tracking-wider">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm font-serif">
                      {tx.type === 'income' ? (
                        <span className="text-green-800 font-bold">+ {formatRupiah(tx.amount)}</span>
                      ) : (
                        <span className="text-red-800 font-bold">- {formatRupiah(tx.amount)}</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-2 text-slate-400 hover:text-red-800 rounded-full hover:bg-white/80 border border-transparent hover:border-black/5 transition"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400 italic font-serif">
                    Tidak ada catatan transaksi keuangan yang sesuai dengan filter pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL ENTRY ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#F9F8F6] rounded-[32px] border border-black/10 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#EFECE7] border-b border-black/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1A1A1A]" />
                <h3 className="font-serif text-lg text-[#1A1A1A]">Mulai Pencatatan Manual</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-white/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleManualSubmit} className="p-6 space-y-5 overflow-y-auto">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Transaction Type Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewType('expense')}
                  className={`py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition border flex items-center justify-center gap-1.5 ${
                    newType === 'expense'
                      ? 'bg-red-800 text-white border-red-800'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-black/10'
                  }`}
                >
                  🔴 Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('income')}
                  className={`py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition border flex items-center justify-center gap-1.5 ${
                    newType === 'income'
                      ? 'bg-green-800 text-white border-green-800'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-black/10'
                  }`}
                >
                  🟢 Pemasukan
                </button>
              </div>

              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Nominal Uang (Rupiah)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xs font-bold text-[#1A1A1A]/40">Rp</span>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    placeholder="Contoh: 15000"
                    className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Category input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Pilih Kategori</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                >
                  {CATEGORIES.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Tanggal Catatan</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Contoh: Beli Soto Ayam Madura"
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-6 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-black/10 text-[#1A1A1A] rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#EFECE7] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
