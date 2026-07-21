/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { Transaction } from '../types';
import { jsPDF } from 'jspdf';

interface DateReportProps {
  transactions: Transaction[];
}

export default function DateReport({ transactions }: DateReportProps) {
  // Get date strings for quick defaults
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const getStartOfCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // State for start and end dates
  const [startDate, setStartDate] = useState(getDaysAgoStr(30)); // default to last 30 days
  const [endDate, setEndDate] = useState(getTodayStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<'30days' | 'today' | '7days' | 'month' | 'all' | 'custom'>('30days');

  // Handle Preset Clicks
  const applyPreset = (preset: 'today' | '7days' | '30days' | 'month' | 'all') => {
    setActivePreset(preset);
    const today = getTodayStr();
    
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      setStartDate(getDaysAgoStr(7));
      setEndDate(today);
    } else if (preset === '30days') {
      setStartDate(getDaysAgoStr(30));
      setEndDate(today);
    } else if (preset === 'month') {
      setStartDate(getStartOfCurrentMonthStr());
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(today);
    }
  };

  // Filter transactions based on date range and search query
  const filteredTxs = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = t.date.split('T')[0];
      const isInRange = txDate >= startDate && txDate <= endDate;
      const matchesSearch =
        searchQuery === '' ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return isInRange && matchesSearch;
    });
  }, [transactions, startDate, endDate, searchQuery]);

  // Calculate high-level stats for selected period
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTxs.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    const net = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;
    return { income, expense, net, savingsRate };
  }, [filteredTxs]);

  // Calculate category breakdowns for selected period
  const categoryBreakdown = useMemo(() => {
    const expenses: { [key: string]: number } = {};
    const incomes: { [key: string]: number } = {};

    filteredTxs.forEach((t) => {
      if (t.type === 'expense') {
        expenses[t.category] = (expenses[t.category] || 0) + t.amount;
      } else {
        incomes[t.category] = (incomes[t.category] || 0) + t.amount;
      }
    });

    const expList = Object.entries(expenses)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const incList = Object.entries(incomes)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { expList, incList };
  }, [filteredTxs]);

  // Generate Narratives / Smart AI Insights (Client-side Journalistic Style)
  const financialInsights = useMemo(() => {
    if (filteredTxs.length === 0) {
      return 'Belum ada catatan aktivitas keuangan pada rentang tanggal yang dipilih. Silakan ubah filter tanggal atau mulailah mencatat transaksi Anda melalui Simulator WA.';
    }

    const { income, expense, net, savingsRate } = totals;
    const { expList } = categoryBreakdown;
    
    let analysisText = '';
    let recommendation = '';

    // Spending status narrative
    if (net < 0) {
      analysisText += `Aliran kas Anda pada periode ini mengalami defisit sebesar ${formatRupiah(Math.abs(net))}. Pengeluaran Anda (${formatRupiah(expense)}) melebihi pemasukan Anda (${formatRupiah(income)}). `;
      recommendation += 'Cobalah untuk menunda pengeluaran non-esensial dan periksa kembali kategori belanja terbesar Anda. ';
    } else {
      analysisText += `Kondisi kas Anda pada periode ini menunjukkan surplus positif sebesar ${formatRupiah(net)}. Anda berhasil menghemat sekitar ${savingsRate}% dari total pemasukan Anda. `;
      recommendation += 'Pertahankan rasio penghematan ini. Anda bisa mengalokasikan surplus ini ke tabungan darurat atau investasi jangka panjang. ';
    }

    // Top Expense Category Analysis
    if (expList.length > 0) {
      const topExp = expList[0];
      const topPercentage = expense > 0 ? Math.round((topExp.amount / expense) * 100) : 0;
      analysisText += `Konsentrasi pengeluaran terbesar Anda berada di kategori "${topExp.category}" dengan total ${formatRupiah(topExp.amount)}, yang mencakup ${topPercentage}% dari total belanja Anda. `;
      
      if (topExp.category === 'Makanan') {
        recommendation += 'Untuk berhemat di sektor makanan, mulailah merencanakan menu mingguan (meal prep) dan batasi frekuensi makan di luar rumah.';
      } else if (topExp.category === 'Belanja' || topExp.category === 'Hiburan') {
        recommendation += 'Kategori belanja/hiburan bersifat diskresioner. Pertimbangkan metode "24-hour rule" sebelum membeli barang non-primer.';
      } else {
        recommendation += `Perhatikan efisiensi pengeluaran pada kategori "${topExp.category}" agar alokasi kas dapat lebih seimbang.`;
      }
    } else {
      analysisText += 'Anda tidak mencatat adanya pengeluaran belanja pada periode ini.';
    }

    return {
      overview: analysisText,
      recommendation: recommendation
    };
  }, [filteredTxs, totals, categoryBreakdown]);

  // Format currency helper
  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  // Format date helper for display
  function formatDateIndo(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // GENERATE PERIODIC PDF STATEMENT
  const downloadPeriodicPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Elegant Editorial Theme Colors
    const primaryColor = [26, 26, 26]; // Rich Charcoal / Black
    const accentColor = [166, 124, 82]; // Classic Bronze / Gold accent
    const lightBg = [239, 236, 231]; // Editorial Warm Cream
    const darkText = [26, 26, 26];
    const textMuted = [115, 115, 115];

    // Set document properties
    doc.setProperties({
      title: `Laporan Keuangan Periodik (${startDate} s.d ${endDate})`,
      subject: 'Rekap Kas Berdasarkan Rentang Tanggal',
      author: 'Finansa.ai',
      creator: 'Google AI Studio Applet'
    });

    // 1. Elegant Header Title (Classic editorial style with layout boundaries)
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.5);
    doc.line(15, 15, 195, 15); // Top border line

    doc.setFont('times', 'italic');
    doc.setFontSize(28);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Finansa.ai', 15, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('PERSONAL FINANCE INTELLIGENCE VIA WHATSAPP', 15, 31);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('LAPORAN PERIODE BERKALA', 135, 23);
    doc.setFont('times', 'italic');
    doc.text(`${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}`, 135, 28);

    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.2);
    doc.line(15, 35, 195, 35); // Lower header border line

    // 2. Summary Block (Editorial Warm Cream Container)
    const blockY = 42;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, blockY, 180, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('TOTAL PEMASUKAN', 22, blockY + 8);
    doc.text('TOTAL PENGELUARAN', 82, blockY + 8);
    doc.text('SALDO NETO BERSIH', 142, blockY + 8);

    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green for income
    doc.text(formatRupiah(totals.income), 22, blockY + 18);

    doc.setTextColor(220, 38, 38); // Red for expense
    doc.text(formatRupiah(totals.expense), 82, blockY + 18);

    const isPositive = totals.net >= 0;
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont('times', 'bold');
    doc.text(`${isPositive ? '+' : ''}${formatRupiah(totals.net)}`, 142, blockY + 18);

    // Savings Rate Badge Info
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(`Rasio Penghematan Periode Ini: ${totals.savingsRate}%`, 22, blockY + 24);

    // 3. AI Insights Narrative Section (Beautiful Serif Quotes)
    let currentY = 82;
    if (typeof financialInsights !== 'string') {
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text('Analisis & Rekomendasi Kas Intelijen', 15, currentY);

      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);

      // Split text to fit page width safely
      const overviewLines = doc.splitTextToSize(financialInsights.overview, 175);
      const recommendationLines = doc.splitTextToSize(`Saran Perbaikan: ${financialInsights.recommendation}`, 175);

      doc.text(overviewLines, 15, currentY + 7);
      
      const nextY = currentY + 10 + (overviewLines.length * 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120, 80, 40); // goldish/bronze tone
      doc.text(recommendationLines, 15, nextY);

      currentY = nextY + 12 + (recommendationLines.length * 4.5);
    }

    // 4. Category Breakdown Table
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Proporsi Pengeluaran Berdasarkan Kategori', 15, currentY);

    let listY = currentY + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (categoryBreakdown.expList.length > 0) {
      categoryBreakdown.expList.forEach((item) => {
        if (item.amount > 0) {
          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.text(item.category, 15, listY);

          const pct = totals.expense > 0 ? Math.round((item.amount / totals.expense) * 100) : 0;
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text(`${pct}% dari total pengeluaran`, 70, listY);

          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.setFont('times', 'bold');
          doc.text(formatRupiah(item.amount), 155, listY);
          doc.setFont('helvetica', 'normal');

          listY += 6.5;
        }
      });
    } else {
      doc.setFont('times', 'italic');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Tidak ada pengeluaran belanja tercatat pada periode ini.', 15, listY);
      listY += 8;
    }

    // 5. Transaction History Table (New Page if needed)
    currentY = listY + 8;
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text('Detil Riwayat Transaksi Buku Kas', 15, currentY);

    const tableY = currentY + 6;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, tableY, 180, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('TANGGAL', 18, tableY + 5);
    doc.text('KATEGORI', 48, tableY + 5);
    doc.text('KETERANGAN', 83, tableY + 5);
    doc.text('SUMBER', 145, tableY + 5);
    doc.text('NOMINAL', 170, tableY + 5);

    let rowY = tableY + 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);

    filteredTxs.slice(0, 30).forEach((tx, index) => {
      if (rowY > 275) {
        doc.addPage();
        rowY = 25;
        // Redraw table header on new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, rowY, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TANGGAL', 18, rowY + 5);
        doc.text('KATEGORI', 48, rowY + 5);
        doc.text('KETERANGAN', 83, rowY + 5);
        doc.text('SUMBER', 145, rowY + 5);
        doc.text('NOMINAL', 170, rowY + 5);
        rowY += 13;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 246, 242);
        doc.rect(15, rowY - 4, 180, 6.5, 'F');
      }

      doc.setFont('courier', 'normal');
      doc.text(tx.date.split('T')[0], 18, rowY);
      
      doc.setFont('helvetica', 'normal');
      doc.text(tx.category, 48, rowY);
      
      const descShort = tx.description.length > 32 ? `${tx.description.substring(0, 30)}...` : tx.description;
      doc.text(descShort, 83, rowY);
      
      const sourceLabel = tx.source.startsWith('whatsapp') ? 'WhatsApp' : 'Manual';
      doc.text(sourceLabel, 145, rowY);

      const sign = tx.type === 'income' ? '+' : '-';
      doc.setFont('times', 'bold');
      doc.text(`${sign}${formatRupiah(tx.amount)}`, 170, rowY);
      doc.setFont('helvetica', 'normal');

      rowY += 6.5;
    });

    if (filteredTxs.length === 0) {
      doc.setFont('times', 'italic');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Tidak ada transaksi untuk dicantumkan.', 15, rowY + 4);
    }

    // Elegant Editorial Footer Line
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.3);
    doc.line(15, 282, 195, 282);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Enkripsi AES-256 Perbankan - Finansa.ai Premium Tier Statement', 15, 286);
    doc.text('Dikelola secara otomatis oleh Finansa System AI', 145, 286);

    doc.save(`Laporan_Finansa_Periodik_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Search and Date Controller */}
      <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Penyaringan Laporan Berkala</p>
            <h2 className="text-3xl font-serif text-[#1A1A1A] mt-1">Laporan Keuangan Periodik</h2>
          </div>
          
          <button
            onClick={downloadPeriodicPDF}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#1A1A1A] text-white hover:bg-black/90 px-6 py-3.5 rounded-full font-bold transition shadow-sm cursor-pointer self-start md:self-auto"
          >
            <Download className="w-3.5 h-3.5" /> Unduh Laporan PDF Periode
          </button>
        </div>

        {/* Preset Ranges buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7days', label: '7 Hari Terakhir' },
            { id: '30days', label: '30 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua Waktu' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-full border transition duration-200 cursor-pointer ${
                activePreset === preset.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A]/70 border-black/10 hover:border-black/30'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Cari Transaksi
            </label>
            <input
              type="text"
              placeholder="Cari deskripsi / kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Overview stats for selected range */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm min-h-[160px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Pemasukan Periode</p>
            <h2 className="text-3xl font-serif text-green-800 font-light mt-3">
              {formatRupiah(totals.income)}
            </h2>
          </div>
          <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[10px] uppercase opacity-50 font-bold">
            <span>Aliran Masuk</span>
            <TrendingUp className="w-4 h-4 text-green-800" />
          </div>
        </div>

        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm min-h-[160px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Pengeluaran Periode</p>
            <h2 className="text-3xl font-serif text-red-800 font-light mt-3">
              {formatRupiah(totals.expense)}
            </h2>
          </div>
          <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[10px] uppercase opacity-50 font-bold">
            <span>Aliran Keluar</span>
            <TrendingDown className="w-4 h-4 text-red-800" />
          </div>
        </div>

        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm min-h-[160px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Selisih Kas Bersih</p>
            <h2 className={`text-3xl font-serif font-light mt-3 ${totals.net >= 0 ? 'text-[#1A1A1A]' : 'text-red-800'}`}>
              {totals.net >= 0 ? '+' : ''}{formatRupiah(totals.net)}
            </h2>
          </div>
          <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[10px] uppercase opacity-50 font-bold">
            <span>Saldo Bersih</span>
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 flex flex-col justify-between shadow-sm min-h-[160px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Rasio Tabungan</p>
            <h2 className="text-4xl font-serif text-[#1A1A1A] italic font-light mt-3">
              {totals.savingsRate}%
            </h2>
          </div>
          <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[10px] uppercase opacity-50 font-bold">
            <span>Persentase Surplus</span>
            <span className="font-mono">{totals.savingsRate > 20 ? 'Sehat' : 'Sempit'}</span>
          </div>
        </div>
      </div>

      {/* AI Intelligence / Dynamic Editorial Insights */}
      <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4 mb-4">
          <Sparkles className="w-5 h-5 text-amber-800" />
          <h3 className="font-serif text-lg text-[#1A1A1A]">Analisis Kas Intelijen (Periodik)</h3>
        </div>
        
        {typeof financialInsights === 'string' ? (
          <p className="text-sm font-serif italic text-[#1A1A1A]/60 text-center py-6">{financialInsights}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-8 space-y-3">
              <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/40">Kondisi Aliran Kas</h4>
              <p className="text-sm md:text-base font-serif italic text-[#1A1A1A] leading-relaxed">
                "{financialInsights.overview}"
              </p>
            </div>
            <div className="md:col-span-4 bg-white/40 border border-black/5 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-amber-800 mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Saran Perbaikan
                </h4>
                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-sans">
                  {financialInsights.recommendation}
                </p>
              </div>
              <p className="text-[9px] font-mono opacity-40 mt-4 uppercase tracking-widest">
                Dihitung berdasarkan tren data periode ini
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Categories Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expenses proportion */}
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 shadow-sm flex flex-col">
          <div className="border-b border-black/10 pb-4 mb-6">
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Distribusi Sektor Belanja</p>
            <h3 className="text-2xl font-serif italic text-[#1A1A1A]">Proporsi Pengeluaran</h3>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {categoryBreakdown.expList.map((item, idx) => {
              const pct = totals.expense > 0 ? Math.round((item.amount / totals.expense) * 100) : 0;
              const opacities = ['bg-[#1A1A1A]', 'bg-[#1A1A1A]/80', 'bg-[#1A1A1A]/60', 'bg-[#1A1A1A]/40', 'bg-[#1A1A1A]/20'];
              
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#1A1A1A] font-medium">
                    <span className="font-serif italic">{idx + 1}. {item.category}</span>
                    <span className="font-mono text-[11px] font-bold">{formatRupiah(item.amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${opacities[idx % opacities.length]}`}
                    />
                  </div>
                </div>
              );
            })}

            {categoryBreakdown.expList.length === 0 && (
              <div className="text-center py-8 text-[#1A1A1A]/40 italic text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-black/10 rounded-2xl">
                <span>Tidak ada belanja pengeluaran tercatat pada periode ini.</span>
              </div>
            )}
          </div>
        </div>

        {/* Incomes proportion */}
        <div className="bg-[#EFECE7] rounded-[32px] p-8 border border-black/5 shadow-sm flex flex-col">
          <div className="border-b border-black/10 pb-4 mb-6">
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Sumber Aliran Masuk</p>
            <h3 className="text-2xl font-serif italic text-[#1A1A1A]">Proporsi Pemasukan</h3>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {categoryBreakdown.incList.map((item, idx) => {
              const pct = totals.income > 0 ? Math.round((item.amount / totals.income) * 100) : 0;
              const opacities = ['bg-green-800', 'bg-green-800/80', 'bg-green-800/60', 'bg-green-800/40', 'bg-green-800/20'];
              
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#1A1A1A] font-medium">
                    <span className="font-serif italic">{idx + 1}. {item.category}</span>
                    <span className="font-mono text-[11px] font-bold">{formatRupiah(item.amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${opacities[idx % opacities.length]}`}
                    />
                  </div>
                </div>
              );
            })}

            {categoryBreakdown.incList.length === 0 && (
              <div className="text-center py-8 text-[#1A1A1A]/40 italic text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-black/10 rounded-2xl">
                <span>Tidak ada pemasukan tercatat pada periode ini.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List of transactions for selected date range */}
      <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 p-8 space-y-6 shadow-sm">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Arsip Riwayat Detil</p>
          <h3 className="text-2xl font-serif text-[#1A1A1A]">Daftar Kas Pada Periode Ini</h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#1A1A1A] text-[9px] font-bold text-white uppercase tracking-widest">
                <th className="p-4 pl-6">Tanggal</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Keterangan / Kunci Transaksi</th>
                <th className="p-4">Sumber</th>
                <th className="p-4 pr-6">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-xs text-[#1A1A1A] font-medium">
              {filteredTxs.map((tx) => {
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
                    <td className="p-4 pr-6 whitespace-nowrap text-sm font-serif">
                      {tx.type === 'income' ? (
                        <span className="text-green-800 font-bold">+ {formatRupiah(tx.amount)}</span>
                      ) : (
                        <span className="text-red-800 font-bold">- {formatRupiah(tx.amount)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-400 italic font-serif">
                    Tidak ada catatan transaksi keuangan pada periode yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
