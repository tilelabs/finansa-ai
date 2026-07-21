/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Copy, Check, Info, ArrowRight, ExternalLink, Settings, ShieldCheck } from 'lucide-react';

export default function WebhookSetup() {
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    // Generate the real dynamic webhook URL based on current app hosting
    const origin = window.location.origin;
    setWebhookUrl(`${origin}/api/webhook/whatsapp`);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#EFECE7] rounded-[32px] border border-black/5 shadow-sm p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-black/10 pb-6">
        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Integrasi Server Mandiri</p>
        <h2 className="text-3xl font-serif italic font-light text-[#1A1A1A] flex items-center gap-2">
          Hubungkan ke WhatsApp Asli Anda
        </h2>
        <p className="text-xs text-[#1A1A1A]/70 mt-2">
          Ikuti panduan berikut untuk menghubungkan asisten pintar ini ke nomor WhatsApp Anda menggunakan Twilio Sandbox secara gratis!
        </p>
      </div>

      {/* Webhook Copy Section */}
      <div className="bg-white/50 border border-black/5 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-serif italic text-[#1A1A1A]">Alamat Webhook WhatsApp Anda</h3>
            <p className="text-xs text-[#1A1A1A]/60">Salin tautan ini dan masukkan ke setelan webhook penyedia API WhatsApp Anda</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest bg-[#1A1A1A] text-white hover:bg-black/90 px-5 py-3 rounded-full font-bold transition shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Berhasil Disalin
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Salin Tautan Webhook
              </>
            )}
          </button>
        </div>
        <div className="bg-[#1A1A1A] text-emerald-400 font-mono text-xs p-4 rounded-xl border border-black/10 select-all overflow-x-auto whitespace-nowrap">
          {webhookUrl || 'Mendeteksi alamat server...'}
        </div>
      </div>

      {/* Integration Guide Steps */}
      <div className="space-y-6">
        <h3 className="font-serif text-lg text-[#1A1A1A]">Panduan Hubungkan via Twilio Sandbox (Gratis):</h3>

        <div className="relative border-l border-black/10 pl-6 ml-3 space-y-8">
          {/* Step 1 */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1A1A1A] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold">
              1
            </span>
            <div className="space-y-1">
              <h4 className="font-serif italic text-base text-[#1A1A1A] flex items-center gap-2">
                Buat Akun Twilio Developer
                <a
                  href="https://www.twilio.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-red-800 hover:underline flex items-center gap-0.5 font-sans font-normal uppercase tracking-widest"
                >
                  Buka Twilio <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
              <p className="text-xs text-[#1A1A1A]/70">
                Daftar akun gratis di Twilio. Cari menu <strong className="text-[#1A1A1A]">Console Dashboard</strong> untuk memulai.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1A1A1A] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold">
              2
            </span>
            <div className="space-y-1">
              <h4 className="font-serif italic text-base text-[#1A1A1A]">Aktifkan Sandbox WhatsApp</h4>
              <p className="text-xs text-[#1A1A1A]/70">
                Buka menu <strong className="text-[#1A1A1A]">Messaging → Try It Out → Send a WhatsApp Message</strong> di konsol Twilio. Ikuti petunjuk untuk mengirimkan chat kode rahasia (contoh: <code>join sandbox-code</code>) ke nomor WhatsApp resmi Twilio (<strong className="text-[#1A1A1A] font-mono">+1 415 523 8886</strong>).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1A1A1A] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold">
              3
            </span>
            <div className="space-y-1">
              <h4 className="font-serif italic text-base text-[#1A1A1A]">Atur Konfigurasi Webhook</h4>
              <p className="text-xs text-[#1A1A1A]/70">
                Pilih tab <strong className="text-[#1A1A1A]">Sandbox Settings</strong> di halaman Sandbox Twilio. Di dalam kolom <strong className="text-[#1A1A1A]">"WHEN A MESSAGE COMES IN"</strong>, tempelkan Tautan Webhook yang sudah disalin di atas. Pastikan metode HTTP di sebelahnya disetel ke <strong className="text-[#1A1A1A] font-extrabold font-mono">POST</strong>.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1A1A1A] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold">
              4
            </span>
            <div className="space-y-1">
              <h4 className="font-serif italic text-base text-[#1A1A1A]">Uji Coba Hubungan Otomatis</h4>
              <p className="text-xs text-[#1A1A1A]/70">
                Sekarang, silakan coba kirim pesan chat teks atau kirim foto struk belanja aslimu langsung ke nomor WhatsApp Twilio tersebut! Server ini akan menganalisis struk aslimu lewat AI dan membalas otomatis di WhatsApp sekaligus menyimpannya ke Dasbor ini!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Warning Container */}
      <div className="p-5 bg-white/40 text-[#1A1A1A] text-xs rounded-2xl border border-black/5 flex gap-4">
        <ShieldCheck className="w-6 h-6 text-green-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-sm">Keamanan Data & Privasi Terjamin</h4>
          <p className="text-[11px] leading-relaxed text-[#1A1A1A]/70 font-sans">
            Kunci API Gemini Kakak tersimpan dengan sangat aman di server dan tidak pernah terekspos ke browser atau pihak ketiga. Saat Kakak mengirim gambar struk ke WhatsApp Twilio, server ini mengambil gambar tersebut secara rahasia dan langsung memprosesnya menggunakan model <strong>Gemini 3.5 Flash</strong> dengan perlindungan data penuh.
          </p>
        </div>
      </div>
    </div>
  );
}
