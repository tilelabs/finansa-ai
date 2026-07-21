/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Transaction } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'transactions.json');

// Helper to get past dates
function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'init-1',
    type: 'income',
    amount: 7500000,
    category: 'Gaji',
    description: 'Gaji Bulanan Utama',
    date: getPastDate(25),
    source: 'manual',
  },
  {
    id: 'init-2',
    type: 'expense',
    amount: 45000,
    category: 'Makanan',
    description: 'Nasi Goreng & Es Teh Hangat',
    date: getPastDate(24),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-3',
    type: 'expense',
    amount: 150000,
    category: 'Transportasi',
    description: 'Isi Bensin Mobil Pertamax',
    date: getPastDate(23),
    source: 'whatsapp',
  },
  {
    id: 'init-4',
    type: 'expense',
    amount: 350000,
    category: 'Hiburan',
    description: 'Tiket Bioskop & Popcorn',
    date: getPastDate(22),
    source: 'manual',
  },
  {
    id: 'init-5',
    type: 'income',
    amount: 1200000,
    category: 'Freelance',
    description: 'Desain Logo UMKM',
    date: getPastDate(20),
    source: 'whatsapp',
  },
  {
    id: 'init-6',
    type: 'expense',
    amount: 28000,
    category: 'Makanan',
    description: 'Kopi Susu Gula Aren',
    date: getPastDate(19),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-7',
    type: 'expense',
    amount: 180000,
    category: 'Belanja',
    description: 'Belanja Bulanan Alfamart',
    date: getPastDate(15),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-8',
    type: 'expense',
    amount: 320000,
    category: 'Tagihan',
    description: 'Tagihan Listrik PLN',
    date: getPastDate(12),
    source: 'manual',
  },
  {
    id: 'init-9',
    type: 'expense',
    amount: 55000,
    category: 'Makanan',
    description: 'Bakso Malang Spesial',
    date: getPastDate(10),
    source: 'whatsapp',
  },
  {
    id: 'init-10',
    type: 'income',
    amount: 450000,
    category: 'Freelance',
    description: 'Ulasan Produk Sosmed',
    date: getPastDate(8),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-11',
    type: 'expense',
    amount: 60000,
    category: 'Transportasi',
    description: 'Top up E-Money Toll',
    date: getPastDate(6),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-12',
    type: 'expense',
    amount: 120000,
    category: 'Belanja',
    description: 'Beli Kaos Polos Hitam',
    date: getPastDate(4),
    source: 'manual',
  },
  {
    id: 'init-13',
    type: 'expense',
    amount: 35000,
    category: 'Makanan',
    description: 'Sate Ayam Madura',
    date: getPastDate(2),
    source: 'whatsapp_simulated',
  },
  {
    id: 'init-14',
    type: 'expense',
    amount: 25000,
    category: 'Makanan',
    description: 'Bubur Ayam Pagi',
    date: getPastDate(1),
    source: 'whatsapp',
  },
  {
    id: 'init-15',
    type: 'expense',
    amount: 15000,
    category: 'Lain-lain',
    description: 'Parkir Liar',
    date: getPastDate(0),
    source: 'whatsapp_simulated',
  }
];

export function readTransactions(): Transaction[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeTransactions(INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading transactions DB, using fallback:', err);
    return INITIAL_TRANSACTIONS;
  }
}

export function writeTransactions(data: Transaction[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing transactions DB:', err);
  }
}

export function addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  const list = readTransactions();
  const newTx: Transaction = {
    ...transaction,
    id: 'tx-' + Math.random().toString(36).substr(2, 9),
  };
  list.push(newTx);
  // Sort by date descending
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  writeTransactions(list);
  return newTx;
}

export function deleteTransaction(id: string): boolean {
  const list = readTransactions();
  const filtered = list.filter((t) => t.id !== id);
  if (filtered.length !== list.length) {
    writeTransactions(filtered);
    return true;
  }
  return false;
}
