/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { readTransactions, addTransaction, deleteTransaction } from './server/db';
import { parseWithGemini } from './server/gemini';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 receipts
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // Get all transactions
  app.get('/api/transactions', (req, res) => {
    try {
      const list = readTransactions();
      res.json({ success: true, transactions: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create a transaction manually from the dashboard
  app.post('/api/transactions', (req, res) => {
    try {
      const { type, amount, category, description, date, source } = req.body;
      if (!type || !amount || !category) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const tx = addTransaction({
        type,
        amount: Number(amount),
        category,
        description: description || '',
        date: date || new Date().toISOString(),
        source: source || 'manual',
      });

      res.json({ success: true, transaction: tx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a transaction
  app.delete('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const done = deleteTransaction(id);
      if (done) {
        res.json({ success: true, message: 'Transaction deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Transaction not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Chatbot Simulator Endpoint (for frontend WhatsApp interface)
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, image, mimeType } = req.body;

      if (!message && !image) {
        return res.status(400).json({ success: false, error: 'Pesan atau gambar harus disertakan.' });
      }

      // Analyze using Gemini (with smart fallback if key is missing)
      const parseResult = await parseWithGemini(message, image, mimeType);

      let savedTransaction = null;
      if (parseResult.isTransaction && parseResult.amount > 0) {
        // Save the parsed transaction to DB
        savedTransaction = addTransaction({
          type: parseResult.type,
          amount: parseResult.amount,
          category: parseResult.category,
          description: parseResult.description,
          date: new Date().toISOString().split('T')[0], // Log on today's date
          source: 'whatsapp_simulated',
        });
      }

      res.json({
        success: true,
        replyMessage: parseResult.replyMessage,
        transaction: savedTransaction,
        isTransaction: parseResult.isTransaction,
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan internal server.',
        replyMessage: `⚠️ *Maaf Kak, terjadi kendala teknis pada server.* \n\nMohon ulangi lagi dalam beberapa saat ya!`,
      });
    }
  });

  // REAL WhatsApp Webhook (compatible with Twilio Sandbox & Webhook flow)
  // Explains in UI instructions how to hook up their Twilio Number to this endpoint
  app.post('/api/webhook/whatsapp', async (req, res) => {
    try {
      // Twilio webhooks are URL-encoded. Parameters:
      // Body: Message content
      // NumMedia: number of media attachments
      // MediaUrl0: URL of the media (if NumMedia > 0)
      // MediaContentType0: e.g. image/jpeg
      // From: sender WhatsApp number (e.g., whatsapp:+6281234567)
      const text = req.body.Body || '';
      const numMedia = parseInt(req.body.NumMedia || '0', 10);
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = req.body.MediaContentType0 || 'image/jpeg';
      const sender = req.body.From || 'Unknown';

      console.log(`[WhatsApp Webhook] Incoming message from ${sender}. Text: "${text}". Media attachments: ${numMedia}`);

      let base64Image: string | undefined = undefined;

      if (numMedia > 0 && mediaUrl) {
        try {
          console.log(`[WhatsApp Webhook] Fetching media from Twilio storage: ${mediaUrl}`);
          const imgResponse = await fetch(mediaUrl);
          if (imgResponse.ok) {
            const arrayBuffer = await imgResponse.arrayBuffer();
            base64Image = Buffer.from(arrayBuffer).toString('base64');
            console.log('[WhatsApp Webhook] Successfully fetched and converted media to base64');
          } else {
            console.error(`[WhatsApp Webhook] Failed to fetch media from ${mediaUrl}. Status: ${imgResponse.status}`);
          }
        } catch (fetchErr) {
          console.error('[WhatsApp Webhook] Error fetching media:', fetchErr);
        }
      }

      // Analyze using our Gemini parsing engine
      const parseResult = await parseWithGemini(text, base64Image, mediaType);

      if (parseResult.isTransaction && parseResult.amount > 0) {
        // Log transaction to DB
        addTransaction({
          type: parseResult.type,
          amount: parseResult.amount,
          category: parseResult.category,
          description: `${parseResult.description} (via WA: ${sender.replace('whatsapp:', '')})`,
          date: new Date().toISOString().split('T')[0],
          source: 'whatsapp',
        });
        console.log(`[WhatsApp Webhook] Transaction successfully logged to DB: ${parseResult.type} - Rp ${parseResult.amount}`);
      }

      // Respond with Twilio TwiML XML format so WhatsApp receives the chatbot's automatic reply!
      res.setHeader('Content-Type', 'text/xml');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapeXml(parseResult.replyMessage)}</Message>
</Response>`;

      res.send(twiml);
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Error:', err);
      // Return error message in Twilio XML
      res.setHeader('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>⚠️ Terjadi kesalahan dalam mencatat transaksi Anda. Silakan coba beberapa saat lagi.</Message>
</Response>`);
    }
  });

  // Helper to escape XML characters
  function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // ==========================================
  // VITE & STATIC FILES
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WhatsApp Webhook is active at: http://localhost:${PORT}/api/webhook/whatsapp`);
  });
}

startServer();
