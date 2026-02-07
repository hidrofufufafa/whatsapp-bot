const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════╗');
console.log('║   WHATSAPP COMPLAINT BOT - RAILWAY      ║');
console.log('╚══════════════════════════════════════════╝\n');

// Configuration
const ADMIN_NUMBER = '6282317345176';

// Optimized for Railway
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "railway-bot",
        dataPath: "./.wwebjs_auth"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: process.env.CHROME_BIN || undefined
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

// QR Code handler
client.on('qr', qr => {
    console.log('══════════════════════════════════════════');
    console.log('               QR CODE                    ');
    console.log('══════════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
    console.log('\nScan dengan WhatsApp Mobile');
    console.log('══════════════════════════════════════════\n');
});

// Ready handler
client.on('ready', () => {
    console.clear();
    console.log('══════════════════════════════════════════');
    console.log('     BOT READY & ONLINE ON RAILWAY!      ');
    console.log('══════════════════════════════════════════\n');
    console.log(`✅ Bot aktif di Railway`);
    console.log(`📱 Admin: ${ADMIN_NUMBER}`);
    console.log(`🕒 ${new Date().toLocaleString('id-ID')}`);
    console.log('\n══════════════════════════════════════════\n');
});

// Error handlers
client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Client disconnected:', reason);
    console.log('🔄 Mencoba reconnect...');
    client.initialize();
});

// Message handler (sama seperti sebelumnya)
client.on('message', async (msg) => {
    // ... kode handler message Anda yang sebelumnya ...
    // Copy paste kode message handler dari file sebelumnya
});

// Initialize with retry
const initializeWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔄 Mencoba inisialisasi ke-${i + 1}...`);
            await client.initialize();
            console.log('✅ Inisialisasi berhasil!');
            return;
        } catch (error) {
            console.error(`❌ Inisialisasi gagal (attempt ${i + 1}):`, error.message);
            
            if (i < retries - 1) {
                console.log(`⏳ Menunggu ${delay/1000} detik sebelum mencoba lagi...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // Exponential backoff
            }
        }
    }
    console.error('🚨 Gagal menginisialisasi setelah beberapa percobaan');
    process.exit(1);
};

// Start bot
console.log('🚀 Starting WhatsApp Bot on Railway...\n');
initializeWithRetry();