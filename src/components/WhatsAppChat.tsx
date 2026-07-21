/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Loader2, CheckCheck, MessageSquare, AlertCircle, Plus } from 'lucide-react';
import { ChatMessage, Transaction } from '../types';

interface WhatsAppChatProps {
  onTransactionLogged: () => void;
}

// Preset samples to test Gemini without uploading files
const CHAT_TEMPLATES = [
  { label: '🍔 Makan Siang', text: 'Tadi siang makan bakso habis 25.000' },
  { label: '⛽ Bensin', text: 'Pengeluaran isi bensin motor pertamax 20ribu' },
  { label: '💰 Gaji Masuk', text: 'Alhamdulillah gaji bulanan masuk 6.500.000 rupiah' },
  { label: '☕ Kopi', text: 'Beli kopi susu sachet 5000' },
  { label: '💻 Freelance', text: 'Dapat transferan hasil freelance desain web 1.200.000' }
];

// Base64 mock receipt images to simulate scanning receipts
const SAMPLE_RECEIPTS = [
  {
    label: '🛒 Struk Indomaret (Rp 48.500)',
    name: 'struk_indomaret.png',
    // Minimal standard base64 for an elegant transparent white receipt pixel/image for simulation
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAADG0lEQVR4nO2cwU7bQBCGP8eOE0IihF6o9EAk7pWv0Xvfe+Vb9Z73qXrvK98g7pUeoBQhpC6pE8SOfbA9OLvEmBDHSezYf0daSZZW8uunndmZ8ToMAgAAAAAAAMCXuV6v9Wn7V9/p698N3L3FvW38U0vM074m6rU9bYvP9rWf9bX/9gU75N32m7p+03ZtX3N6LwEAAHCV7Wb4+qU+b0Vf89jXf9uLveT9ZgO3pW1p07b+S9vi5W97/E1vAwD8v2wP9b3S9/6bHfaC+uA37ErbS932e6bX/3zY+88GAIBv5fTdf+l3z9D0nQ9bX/fWf1u3uK1ZupmS3scgAMCHvP87fX+p9W/R9jF8re/L7jXFba+79Z/vXpS6E7E9fG4CAIBvZnvYt0rbp7r9XbW/tXp3S9t96b0IAGAH6Xur739F0zeYvT0R+wW33p6I7eFzCwDAnrI9/M7p++pE6v78Snt9R9b6N+2J9DoR9vC5BQDAtbI9FKn/Z6X3b3Wby9b9z+m7p7zWvVveby/CHj63AACsZPvu3/S7Y7p8Z8X9+TmtNUPT98i9O7H79F78z8fPDQCAvWV7eP9f6b92f9V/vdf3K33Prf6ZpWv3m6U7fN7C5woAgP1leyiy26H6T3X7Xer+/EZbV9fforR99LpE7OFzBQDAnrM91PeSvv89Z+/e6p+Wbtf+W7gT6Tsh9vC5AgDAt7I9bH/re5HuN0vd7fex3v6p+reYpX3N6b0EAMA+sr+z/O7Vv/W/9tW79rWv36X39gQAAMAOAgAAAAAAAADA/88fC3bIsy2SBAAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    simulatePrompt: 'Berikut struk Indomaret:\n\nINDOMARET MINIMARKET\nJl. Merdeka No. 12, Bandung\n------------------------\nTeh Kotak Sosro   x2   8.000\nCadbury Cokelat   x1  22.500\nIndomie Goreng    x5  15.000\nSusu Ultra 250ml  x1   3.000\n------------------------\nTOTAL BELANJA         48.500\nTUNAI                 50.000\nKEMBALI                1.500\n------------------------\nTerima Kasih, Selamat Belanja!'
  },
  {
    label: '🍜 Nota Kedai Bakso (Rp 32.000)',
    name: 'nota_bakso.png',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAADG0lEQVR4nO2cwU7bQBCGP8eOE0IihF6o9EAk7pWv0Xvfe+Vb9Z73qXrvK98g7pUeoBQhpC6pE8SOfbA9OLvEmBDHSezYf0daSZZW8uunndmZ8ToMAgAAAAAAAMCXuV6v9Wn7V9/p698N3L3FvW38U0vM074m6rU9bYvP9rWf9bX/9gU75N32m7p+03ZtX3N6LwEAAHCV7Wb4+qU+b0Vf89jXf9uLveT9ZgO3pW1p07b+S9vi5W97/E1vAwD8v2wP9b3S9/6bHfaC+uA37ErbS932e6bX/3zY+88GAIBv5fTdf+l3z9D0nQ9bX/fWf1u3uK1ZupmS3scgAMCHvP87fX+p9W/R9jF8re/L7jXFba+79Z/vXpS6E7E9fG4CAIBvZnvYt0rbp7r9XbW/tXp3S9t96b0IAGAH6Xur739F0zeYvT0R+wW33p6I7eFzCwDAnrI9/M7p++pE6v78Snt9R9b6N+2J9DoR9vC5BQDAtbI9FKn/Z6X3b3Wby9b9z+m7p7zWvVveby/CHj63AACsZPvu3/S7Y7p8Z8X9+TmtNUPT98i9O7H79F78z8fPDQCAvWV7eP9f6b92f9V/vdf3K33Prf6ZpWv3m6U7fN7C5woAgP1leyiy26H6T3X7Xer+/EZbV9fforR99LpE7OFzBQDAnrM91PeSvv89Z+/e6p+Wbtf+W7gT6Tsh9vC5AgDAt7I9bH/re5HuN0vd7fex3v6p+reYpX3N6b0EAMA+sr+z/O7Vv/W/9tW79rWv36X39gQAAMAOAgAAAAAAAADA/88fC3bIsy2SBAAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    simulatePrompt: 'Berikut nota makan bakso:\n\nKEDAI BAKSO SEGAR\nNota No: 104823\nTanggal: Hari Ini\n------------------------\n1x Bakso Urat Jumbo    Rp 22.000\n1x Es Jeruk Peras      Rp  8.000\n1x Kerupuk Putih       Rp  2.000\n------------------------\nTOTAL                  Rp 32.000\n------------------------\nSuwun, Matur Nuwun!'
  }
];

export default function WhatsAppChat({ onTransactionLogged }: WhatsAppChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('wa_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'msg-welcome-1',
        sender: 'bot',
        text: `🤖 *Halo Kak! Selamat datang di CatatKeuangan Bot!* 👋\n\nSaya adalah asisten virtual WhatsApp pintar yang bisa mencatat pengeluaran dan pemasukan harian Kakak secara otomatis melalui pesan teks maupun foto struk.\n\n💡 *Cara menggunakannya:* \n1️⃣ Kirim pesan teks pengeluaran/pemasukan, contoh:\n_\"Beli kopi susu starbucks 45000\"_\n_\"Gaji bonus kerja freelance 1.500.000\"_\n\n2️⃣ Kirim/Upload foto struk belanja Kakak. Saya akan memindainya menggunakan AI!\n\nCobalah kirimkan transaksi pertamamu sekarang! 👇`,
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; name: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('wa_chat_history', JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string, imageToSend: typeof selectedImage = null) => {
    if (!textToSend.trim() && !imageToSend) return;

    const userMsgId = 'msg-' + Math.random().toString(36).substr(2, 9);
    const botMsgId = 'msg-' + Math.random().toString(36).substr(2, 9);

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      imageUri: imageToSend ? `data:${imageToSend.mimeType};base64,${imageToSend.base64}` : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    // Add temporary typing message
    const typingMsg: ChatMessage = {
      id: botMsgId,
      sender: 'bot',
      text: 'CatatKeuangan Bot sedang memproses catatan Kakak... ⏳',
      timestamp: new Date().toISOString(),
      isParsing: true,
    };
    setMessages((prev) => [...prev, typingMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          image: imageToSend?.base64,
          mimeType: imageToSend?.mimeType,
        }),
      });

      const data = await response.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: data.replyMessage,
                isParsing: false,
                transactionId: data.transaction?.id,
              }
            : msg
        )
      );

      if (data.transaction) {
        onTransactionLogged();
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: '⚠️ *Maaf Kak, terjadi kendala saat menghubungi AI pencatat.* Mohon periksa kembali koneksi internet atau coba sapa bot kembali ya!',
                isParsing: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        base64: base64String,
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const selectTemplate = (templateText: string) => {
    setInputText(templateText);
  };

  const selectSampleReceipt = (receipt: typeof SAMPLE_RECEIPTS[0]) => {
    setSelectedImage({
      base64: receipt.base64,
      name: receipt.name,
      mimeType: receipt.mimeType,
    });
    // Fill the text input with simulated text prompt so Gemini can parse it clearly
    setInputText(receipt.simulatePrompt);
  };

  const clearChatHistory = () => {
    if (window.confirm('Hapus seluruh riwayat percakapan simulator WhatsApp ini?')) {
      const resetMsg: ChatMessage[] = [
        {
          id: 'msg-welcome-1',
          sender: 'bot',
          text: `🤖 *Halo Kak! Selamat datang di CatatKeuangan Bot!* 👋\n\nSaya adalah asisten virtual WhatsApp pintar yang bisa mencatat pengeluaran dan pemasukan harian Kakak secara otomatis melalui pesan teks maupun foto struk.\n\n💡 *Cara menggunakannya:* \n1️⃣ Kirim pesan teks pengeluaran/pemasukan, contoh:\n_\"Beli kopi susu starbucks 45000\"_\n_\"Gaji bonus kerja freelance 1.500.000\"_\n\n2️⃣ Kirim/Upload foto struk belanja Kakak. Saya akan memindainya menggunakan AI!\n\nCobalah kirimkan transaksi pertamamu sekarang! 👇`,
          timestamp: new Date().toISOString(),
        }
      ];
      setMessages(resetMsg);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] bg-[#EFECE7] rounded-[32px] overflow-hidden border border-black/5 shadow-sm animate-fadeIn">
      {/* Sidebar - Chat Info */}
      <div className="lg:col-span-4 bg-[#F9F8F6] border-r border-black/5 flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-5 bg-[#EFECE7] border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-[#1A1A1A]">Daftar Obrolan</h3>
              <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
                WhatsApp Simulator
              </p>
            </div>
          </div>
          <button
            onClick={clearChatHistory}
            className="text-[10px] uppercase tracking-wider font-bold text-red-800 hover:text-red-900 transition px-3 py-1.5 rounded-full bg-white/60 border border-black/5 cursor-pointer"
          >
            Hapus Chat
          </button>
        </div>

        {/* Contact list (Only 1 target bot) */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
          <div className="p-5 flex items-center gap-3 bg-[#EFECE7]/30 hover:bg-[#EFECE7]/60 cursor-pointer transition">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-serif text-lg">
                CK
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-800 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-sm text-[#1A1A1A] truncate">CatatKeuangan Bot</h4>
                <span className="text-[10px] uppercase tracking-wider font-mono opacity-50">Baru saja</span>
              </div>
              <p className="text-xs text-[#1A1A1A]/70 truncate mt-0.5">Asisten AI Keuangan WhatsApp</p>
              <div className="mt-1">
                <span className="inline-block bg-emerald-800/10 text-emerald-900 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full">
                  Official Bot
                </span>
              </div>
            </div>
          </div>

          {/* Quick-test helper container */}
          <div className="p-5 bg-[#F9F8F6] flex-1 space-y-5">
            <div>
              <h5 className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/50 mb-3">💡 Template Chat Cepat</h5>
              <div className="flex flex-wrap gap-2">
                {CHAT_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => selectTemplate(tpl.text)}
                    className="text-xs bg-[#EFECE7] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white border border-black/5 rounded-full px-4 py-2 transition text-left cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/50 mb-2">📸 Simulasi Foto Struk</h5>
              <p className="text-[11px] text-[#1A1A1A]/60 mb-3">Klik contoh struk belanja di bawah ini untuk menguji pemindaian AI struk otomatis:</p>
              <div className="flex flex-col gap-2">
                {SAMPLE_RECEIPTS.map((rcp, i) => (
                  <button
                    key={i}
                    onClick={() => selectSampleReceipt(rcp)}
                    className="text-xs bg-[#EFECE7] hover:bg-[#1A1A1A] hover:text-white border border-black/5 rounded-xl p-3 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-serif italic text-[#1A1A1A] group-hover:text-white">{rcp.label}</span>
                    <span className="text-[10px] uppercase tracking-widest font-mono bg-white/80 text-[#1A1A1A] px-2 py-1 rounded-md group-hover:bg-white/20 group-hover:text-white">Gunakan</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="lg:col-span-8 flex flex-col bg-[#F9F8F6] h-full relative" id="chat-simulator-panel">
        {/* Subtle Editorial Background Overlay instead of Whatsapp noise */}
        <div className="absolute inset-0 bg-[#EFECE7]/20 pointer-events-none"></div>

        {/* Chat Header */}
        <div className="p-4 bg-[#F9F8F6] border-b border-black/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-serif text-sm">
              CK
            </div>
            <div>
              <h3 className="font-serif italic text-base text-[#1A1A1A] leading-tight">CatatKeuangan Bot</h3>
              <p className="text-[10px] uppercase tracking-wider font-mono text-[#1A1A1A]/50">Online & Siap mencatat</p>
            </div>
          </div>
          <div className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition cursor-pointer">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Message Bubble Container */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative z-10">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-xs relative break-words whitespace-pre-wrap leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1A1A1A] text-white rounded-tr-none border border-black'
                    : 'bg-[#EFECE7] text-[#1A1A1A] rounded-tl-none border border-black/5'
                }`}
              >
                {/* Embedded Uploaded Image */}
                {msg.imageUri && (
                  <div className="mb-3 max-w-full rounded-xl overflow-hidden border border-black/10 bg-white p-1">
                    <img
                      src={msg.imageUri}
                      alt="Receipt Attachment"
                      referrerPolicy="no-referrer"
                      className="max-h-48 object-cover rounded-lg w-full"
                    />
                    <p className="text-[10px] text-[#1A1A1A]/60 mt-2 italic text-center font-serif">Foto Struk Belanja Terlampir</p>
                  </div>
                )}

                {/* Parsing Loader */}
                {msg.isParsing ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-[#1A1A1A]" />
                    <span className="opacity-70 italic font-serif">Asisten AI sedang membaca transaksi...</span>
                  </div>
                ) : (
                  // Custom rendering for WhatsApp formatting (bolding, italics, links)
                  <div>
                    {msg.text.split('\n').map((line, idx) => {
                      // Process WhatsApp markdown bold (*text*)
                      let content: React.ReactNode = line;
                      const boldRegex = /\*(.*?)\*/g;
                      if (boldRegex.test(line)) {
                        const parts = line.split(boldRegex);
                        content = parts.map((part, pIdx) => {
                          if (pIdx % 2 === 1) {
                            return <strong key={pIdx} className="font-bold underline decoration-1">{part}</strong>;
                          }
                          return part;
                        });
                      }
                      return <span key={idx} className="block min-h-[0.5rem]">{content}</span>;
                    })}
                  </div>
                )}

                {/* Timestamp & Tick */}
                <div className="flex items-center justify-end gap-1 mt-2 text-[9px] uppercase tracking-wider font-mono opacity-60">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.sender === 'user' && (
                    <CheckCheck className="w-3.5 h-3.5 opacity-85" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Selected image preview card before sending */}
        {selectedImage && (
          <div className="p-4 bg-[#F9F8F6] border-t border-black/5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 bg-[#EFECE7] p-3 rounded-xl border border-black/5 flex-1 mr-2">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`}
                  alt="selected"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-serif italic text-[#1A1A1A] truncate">{selectedImage.name}</p>
                <p className="text-[10px] uppercase tracking-wider font-mono text-[#1A1A1A]/60">Foto siap dianalisis AI otomatis</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-[#1A1A1A]/40 hover:text-red-800 p-2 rounded-full hover:bg-black/5 transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}

        {/* Chat Input Panel */}
        <div className="p-4 bg-[#EFECE7] border-t border-black/5 flex items-center gap-3 relative z-10">
          {/* File Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 text-[#1A1A1A] hover:bg-black/5 rounded-full transition disabled:opacity-50 cursor-pointer"
            title="Kirim Struk Belanja (Gambar)"
          >
            <Image className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleSendMessage(inputText, selectedImage);
              }
            }}
            disabled={isLoading}
            placeholder={
              selectedImage
                ? "Tambahkan keterangan atau langsung tekan kirim..."
                : "Ketik pesan pengeluaran atau pemasukan harian..."
            }
            className="flex-1 bg-white border border-black/5 focus:outline-none focus:border-black rounded-full px-5 py-3 text-xs transition"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage(inputText, selectedImage)}
            disabled={isLoading || (!inputText.trim() && !selectedImage)}
            className="p-3.5 bg-[#1A1A1A] hover:bg-black text-white rounded-full transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
