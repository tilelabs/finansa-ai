/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string; // ISO string YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ
  source: 'whatsapp' | 'manual' | 'whatsapp_simulated';
  receiptUrl?: string; // If image was parsed
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string; // ISO string
  imageUri?: string; // Base64 of image if uploaded
  transactionId?: string; // Linked transaction
  isParsing?: boolean; // Parsing status indicator
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

export interface WeeklySummary {
  day: string;
  income: number;
  expense: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  type: 'income' | 'expense';
}
