/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { Transaction } from '../src/types';

// Initialize Gemini SDK with telemetry user-agent and key from env
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY is not defined in the environment. Chatbot analysis will fallback to static parsing.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

interface GeminiParseResult {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  replyMessage: string;
  isTransaction: boolean;
}

export async function parseWithGemini(
  text?: string,
  base64Image?: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiParseResult> {
  const ai = getGeminiClient();

  // Robust fallback if API Key is not set yet
  if (!ai) {
    return runFallbackParser(text, !!base64Image);
  }

  try {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const systemInstruction = `Anda adalah asisten chatbot WhatsApp pencatat keuangan bernama "CatatKeuangan Bot".
Tugas utama Anda adalah mengekstrak catatan keuangan (pemasukan atau pengeluaran) dari pesan teks atau foto struk/nota belanja yang dikirimkan pengguna.

Ketentuan Analisis:
1. Tentukan jenis transaksi: 'income' (pemasukan, uang masuk, gaji, transferan masuk, dll) atau 'expense' (pengeluaran, beli barang, bayar tagihan, dll).
2. Ekstrak nilai nominal (amount) sebagai angka murni (tanpa titik/koma ribuan). Jika struk memiliki total, gunakan total akhir belanja.
3. Tentukan kategori terbaik dari pilihan berikut saja: 'Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Gaji', 'Freelance', 'Hiburan', 'Lain-lain'.
4. Buat deskripsi singkat transaksi yang mudah dimengerti (misal: "Beli kopi susu", "Bayar tagihan listrik", "Gaji bulanan").
5. Format tanggal transaksi adalah hari ini jika tidak ada tanggal spesifik yang disebutkan di teks. Tanggal hari ini adalah: ${todayStr}.
6. Jika pesan dari pengguna HANYA sapaan (seperti "halo", "p", "test") atau bukan transaksi keuangan, set isTransaction = false, set amount = 0, kategori = 'Lain-lain', deskripsi = 'Chat', dan berikan balasan ramah yang menjelaskan bahwa Anda adalah bot pencatat keuangan siap membantu mencatat transaksi via teks (contoh: "Beli bakso 20rb" atau kirim foto struk/nota).

Format balasan WhatsApp (replyMessage):
- Gunakan bahasa Indonesia yang ramah, sopan, dan santai (gunakan sapaan 'Kak' atau 'Kakak').
- Gunakan format cetak tebal khas WhatsApp yaitu mengapit kata dengan tanda bintang (*) untuk mempercantik (contoh: *Pemasukan*, *Detail Transaksi*).
- Gunakan emoji yang relevan (🔴 untuk pengeluaran, 🟢 untuk pemasukan, 📝 untuk detail, dll) agar chat terlihat interaktif seperti chatbot aslinya.
- Berikan penutup yang menyenangkan atau tips keuangan singkat.`;

    const contents: any[] = [];

    if (text) {
      contents.push({ text: `Pesan teks pengguna: "${text}"` });
    }

    if (base64Image) {
      contents.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
      contents.push({ text: "Berikut adalah foto struk/nota yang dikirim oleh pengguna. Harap baca detail total pembayaran, nama toko, dan barang yang dibeli untuk dicatat sebagai pengeluaran." });
    }

    if (contents.length === 0) {
      throw new Error('No input provided for analysis');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isTransaction: {
              type: Type.BOOLEAN,
              description: "True if the message is a financial transaction (income or expense) that should be logged. False if it is just a casual chat/greeting.",
            },
            type: {
              type: Type.STRING,
              description: "Must be 'income' or 'expense'.",
            },
            amount: {
              type: Type.NUMBER,
              description: "Total parsed numerical amount in IDR.",
            },
            category: {
              type: Type.STRING,
              description: "Categorize into one of: 'Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Gaji', 'Freelance', 'Hiburan', 'Lain-lain'.",
            },
            description: {
              type: Type.STRING,
              description: "Short description of the item or reason.",
            },
            replyMessage: {
              type: Type.STRING,
              description: "The complete, formatted WhatsApp message to send back to the user.",
            },
          },
          required: ['isTransaction', 'type', 'amount', 'category', 'description', 'replyMessage'],
        },
      },
    });

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText);

    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
      category: parsed.category || 'Lain-lain',
      description: parsed.description || 'Transaksi WhatsApp',
      replyMessage: parsed.replyMessage || 'Maaf Kak, terjadi kesalahan saat memproses data transaksi.',
      isTransaction: !!parsed.isTransaction,
    };
  } catch (error) {
    console.error('Gemini processing error, falling back to regex parser:', error);
    return runFallbackParser(text, !!base64Image);
  }
}

// Fallback logic for when Gemini API Key is missing or fails
function runFallbackParser(text: string = '', hasImage: boolean = false): GeminiParseResult {
  const normalized = text.toLowerCase().trim();

  // Casual chats fallback
  if (!hasImage && (normalized === 'halo' || normalized === 'hai' || normalized === 'p' || normalized === 'test' || normalized === 'ping' || normalized === 'menu' || normalized === 'bantuan')) {
    return {
      type: 'expense',
      amount: 0,
      category: 'Lain-lain',
      description: 'Chat',
      isTransaction: false,
      replyMessage: `🤖 *Halo Kak! Selamat datang di CatatKeuangan Bot!* 👋

Saya adalah asisten pintar WhatsApp yang bisa membantu Kakak mencatat pengeluaran dan pemasukan harian secara otomatis.

💡 *Cara Penggunaan:*
1. *Kirim pesan teks langsung*, contoh:
   - _"Beli kopi gula aren 25000"_
   - _"Gaji masuk bulanan 4500000"_
   - _"Isi bensin motor 15rb"_
2. *Kirim foto struk belanja atau kwitansi* langsung ke chat ini. Saya akan membaca total harganya secara otomatis!

Coba kirimkan transaksi pertamamu sekarang yuk! 😊`,
    };
  }

  // Very simple regex parsing for demonstration fallback
  let type: 'income' | 'expense' = 'expense';
  let amount = 0;
  let category = 'Lain-lain';
  let description = 'Transaksi';

  if (hasImage) {
    // If image is uploaded but Gemini isn't available, we'll mock a receipt parse
    amount = 125000;
    category = 'Belanja';
    description = 'Struk Pembelanjaan (Simulasi)';
    return {
      type,
      amount,
      category,
      description,
      isTransaction: true,
      replyMessage: `🤖 *CatatKeuangan Bot - Hasil Scan Struk* 📸

Terima kasih Kak! Struk belanjaan Kakak berhasil dipindai otomatis.

📝 *Detail Catatan:*
- *Tipe:* Pengeluaran 🔴 (Struk Belanja)
- *Nominal:* *Rp 125.000*
- *Kategori:* Belanja 🛒
- *Keterangan:* Struk Pembelanjaan (Simulasi Offline)
- *Tanggal:* ${new Date().toLocaleDateString('id-ID')}

_Catatan berhasil disimpan! (Menggunakan sistem cadangan karena API Key belum terhubung)._`,
    };
  }

  // Parse text
  // Try to find numbers
  const numberMatches = text.replace(/[\.,]/g, '').match(/\d+/);
  if (numberMatches) {
    amount = parseInt(numberMatches[0], 10);
    // Support "rb" or "ribu" or "juta" suffix
    if (/rb|ribu/.test(normalized)) {
      if (amount < 1000) amount *= 1000;
    } else if (/jt|juta/.test(normalized)) {
      if (amount < 1000000) amount *= 1000000;
    }
  } else {
    // No amount found
    return {
      type: 'expense',
      amount: 0,
      category: 'Lain-lain',
      description: text || 'Sapaan',
      isTransaction: false,
      replyMessage: `Hmm, Kakak mau mencatat transaksi ya? Mohon sertakan nominal angkanya ya, contoh: *"Beli bakso 15000"* atau *"Gaji freelance 300rb"*.`,
    };
  }

  // Categorize & determine type
  if (/gaji|pemasukan|income|transfer masuk|freelance|bonus|cair/.test(normalized)) {
    type = 'income';
    category = 'Gaji';
    if (/freelance/.test(normalized)) category = 'Freelance';
    description = text.replace(/\d+|rb|ribu|juta|jt|rupiah|rp/gi, '').trim() || 'Pemasukan';
  } else {
    type = 'expense';
    if (/makan|minum|kopi|bakso|sate|nasgor|boba|sarapan/.test(normalized)) {
      category = 'Makanan';
    } else if (/bensin|gojek|grab|toll|parkir|transport|mobil|motor/.test(normalized)) {
      category = 'Transportasi';
    } else if (/listrik|pln|wifi|indihome|pulsa|kuota|tagihan/.test(normalized)) {
      category = 'Tagihan';
    } else if (/baju|kaos|sepatu|alfamart|indomaret|belanja|supermarket/.test(normalized)) {
      category = 'Belanja';
    } else if (/nonton|bioskop|game|topup|hiburan|netflix/.test(normalized)) {
      category = 'Hiburan';
    }
    description = text.replace(/\d+|rb|ribu|juta|jt|rupiah|rp/gi, '').trim() || 'Pengeluaran';
  }

  // Format amount to Rupiah
  const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  const replyMessage = `🤖 *CatatKeuangan Bot - Berhasil Dicatat* ✅

Halo Kak! Transaksi Kakak berhasil dicatat secara otomatis oleh asisten pintar kami.

📝 *Detail Catatan:*
- *Tipe:* ${type === 'income' ? 'Pemasukan 🟢' : 'Pengeluaran 🔴'}
- *Nominal:* *${formattedAmount}*
- *Kategori:* ${category}
- *Keterangan:* ${description}
- *Tanggal:* ${new Date().toLocaleDateString('id-ID')}

_Sistem cadangan aktif. Hubungkan kunci API Gemini di tab Pengaturan untuk asisten AI cerdas sesungguhnya!_`;

  return {
    type,
    amount,
    category,
    description,
    isTransaction: true,
    replyMessage,
  };
}
