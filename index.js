const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════╗');
console.log('║   WHATSAPP COMPLAINT SERVICE BOT        ║');
console.log('╚══════════════════════════════════════════╝\n');

/* =========================
   CONFIGURATION
========================= */
const ADMIN_NUMBER = '6282317345176'; // Ganti dengan nomor adminmu

/* =========================
   DELAY FUNCTIONALITY
========================= */
const delay = (minSeconds = 5, maxSeconds = 10) => {
    const seconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

/* =========================
   ANTI-SPAM SYSTEM
========================= */
const SPAM_LIMIT = 3; // Maksimal 3 pesan dalam 10 detik
const SPAM_TIME_WINDOW = 10000; // 10 detik
const BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

const spamTracker = new Map();

const checkSpam = (userId) => {
    const now = Date.now();
    const userData = spamTracker.get(userId) || { count: 0, lastMessageTime: 0, blockedUntil: 0 };
    
    // Cek apakah user diblokir
    if (userData.blockedUntil > now) {
        const remainingTime = Math.ceil((userData.blockedUntil - now) / (60 * 60 * 1000));
        return {
            isBlocked: true,
            message: `🚫 Anda telah diblokir sementara karena terdeteksi spam. Layanan akan dibuka kembali dalam ${remainingTime} jam.`
        };
    }
    
    // Reset count jika sudah lewat time window
    if (now - userData.lastMessageTime > SPAM_TIME_WINDOW) {
        userData.count = 0;
    }
    
    // Update data
    userData.count++;
    userData.lastMessageTime = now;
    
    // Cek apakah melebihi limit
    if (userData.count > SPAM_LIMIT) {
        userData.blockedUntil = now + BLOCK_DURATION;
        spamTracker.set(userId, userData);
        
        return {
            isBlocked: true,
            message: `🚫 Anda telah diblokir karena mengirim terlalu banyak pesan dalam waktu singkat. Layanan akan dibuka kembali dalam 24 jam.`
        };
    }
    
    spamTracker.set(userId, userData);
    return { isBlocked: false };
};

/* =========================
   SERVICE INFORMATION
========================= */
const SERVICE_INFO = {
    'nama_bisnis': 'DIGITAL PRODUCT STORE',
    'jam_operasional': '08:00 - 22:00 WIB (Setiap Hari)',
    'alamat': 'Online Store - Delivery via WhatsApp',
    'kontak': '021-12345678'
};

/* =========================
   PRICE LIST - PRODUK DIGITAL
========================= */
const PRICE_LIST = {
    '1': { 
        name: 'Canva Pro 1 Bulan', 
        price: 20000, 
        description: 'Akses premium Canva Team',
        features: ['75+ juta assets', '420K+ template', 'Magic Resize', 'Background Remover', 'Akses Team']
    },
    '2': { 
        name: 'Spotify Premium 3 Bulan', 
        price: 55000, 
        description: 'Akun sharing premium',
        features: ['No ads', 'Download offline', 'Highest quality', 'Unlimited skips', 'Family plan']
    },
    '3': { 
        name: 'Capcut Pro 1 Tahun', 
        price: 85000, 
        description: 'Akses fitur premium Capcut',
        features: ['No ads Capcut', 'Template Premium', 'Akses Cloud', 'Proses 1-10 menit', 'No watermark']
    },
    '4': { 
        name: 'Netflix Premium 1 Bulan', 
        price: 35000, 
        description: 'Akun UHD 4 screen',
        features: ['4K quality', '4 screens', 'Download content', 'No ads', 'All regions']
    },
    '5': { 
        name: 'Microsoft 365 6 Bulan', 
        price: 120000, 
        description: 'Office suite + cloud storage',
        features: ['Word, Excel, PPT', '1TB OneDrive', 'Premium templates', 'Always updated', 'Multi-device']
    },
    '6': { 
        name: 'YouTube Premium 3 Bulan', 
        price: 65000, 
        description: 'YouTube tanpa iklan',
        features: ['No ads YouTube', 'Background play', 'Download video', 'YouTube Music', 'Original content']
    },
    '7': { 
        name: 'Disney+ Hotstar 1 Bulan', 
        price: 30000, 
        description: 'Streaming film & series',
        features: ['Marvel, Star Wars', 'Disney content', '4K streaming', 'Multi-profile', 'Download']
    },
    '8': { 
        name: 'ChatGPT Plus 1 Bulan', 
        price: 95000, 
        description: 'Akses ChatGPT premium',
        features: ['GPT-4 access', 'No limits', 'Faster response', 'Plugins', 'Web browsing']
    }
};

/* =========================
   SNK (Syarat & Ketentuan)
========================= */
const SNK_CONTENT = `📜 *SYARAT & KETENTUAN TOKO DIGITAL*

✅ *GARANSI & JAMINAN:*
1. Garansi produk digital 3 hari jika akun bermasalah
2. Proses 1-24 jam setelah pembayaran dikonfirmasi
3. Support via WhatsApp selama masa aktif

💳 *PEMBAYARAN:*
1. Transfer sebelum 22:00 WIB diproses hari sama
2. Setelah 22:00 WIB diproses besok pagi
3. Screenshot bukti transfer harus jelas terbaca

📦 *PRODUK & LAYANAN:*
1. Masa aktif sesuai paket yang dipilih
2. Akses akun dikirim via WhatsApp
3. Panduan penggunaan disertakan

🚫 *KETENTUAN UMUM:*
1. Tidak ada refund setelah akun dikirim
2. Dilarang share akun ke orang lain
3. Pembatalan hanya sebelum pembayaran

🔄 *KOMPLAIN & KELUHAN:*
1. Respon maksimal 1x24 jam
2. Sertakan bukti yang jelas
3. Komplain via form yang tersedia

Dengan melakukan pembelian, Anda menyetujui semua syarat di atas. ✅`;

/* =========================
   DATABASE FILES
========================= */
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

// Initialize data directory
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize data
const loadJSON = (file, defaultValue = {}) => {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error(`Error loading ${file}:`, e.message);
    }
    return defaultValue;
};

const saveJSON = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error saving ${file}:`, e.message);
        return false;
    }
};

/* =========================
   BOT CLIENT - OPTIMIZED FOR RAILWAY
========================= */
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "railway-complaint-bot",
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
            '--disable-gpu'
        ]
        // HAPUS executablePath
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

/* =========================
   HELPER FUNCTIONS
========================= */
// Fungsi untuk cek admin
const isAdmin = (from) => {
    const fromNumber = from.replace('@c.us', '').replace('@s.whatsapp.net', '');
    
    if (fromNumber === ADMIN_NUMBER) return true;
    if (from.includes(ADMIN_NUMBER)) return true;
    
    const adminId1 = ADMIN_NUMBER + '@c.us';
    const adminId2 = ADMIN_NUMBER + '@s.whatsapp.net';
    if (from === adminId1 || from === adminId2) return true;
    
    return false;
};

// Fungsi untuk generate ID komplain
const generateComplaintId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CMP${year}${month}${day}${random}`;
};

// Fungsi untuk generate feedback ID
const generateFeedbackId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FDB${year}${month}${day}${random}`;
};

// Fungsi untuk extract data dari format komplain
const extractFormData = (text, type = 'complaint') => {
    const lines = text.split('\n');
    let data = {
        nama: '',
        nomor_hp: '',
        alasan: '',
        pesan: ''
    };
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.toLowerCase().includes('nama:') || line.toLowerCase().includes('nama :')) {
            const parts = line.split(':');
            if (parts.length > 1) {
                data.nama = parts.slice(1).join(':').trim();
            }
        }
        else if (line.toLowerCase().includes('no') && (line.toLowerCase().includes('hp') || line.toLowerCase().includes('wa'))) {
            const numberMatch = line.match(/(08\d{9,11})|(\+62\d{9,11})|(62\d{9,11})/);
            if (numberMatch) {
                data.nomor_hp = numberMatch[0];
            } else {
                const parts = line.split(':');
                if (parts.length > 1) {
                    data.nomor_hp = parts.slice(1).join(':').trim().replace(/\D/g, '');
                }
            }
        }
        else if (type === 'complaint' && (line.toLowerCase().includes('alasan:') || line.toLowerCase().includes('keluhan:'))) {
            const parts = line.split(':');
            if (parts.length > 1) {
                data.alasan = parts.slice(1).join(':').trim();
            }
        }
        else if (type === 'feedback' && (line.toLowerCase().includes('pesan:') || line.toLowerCase().includes('ulasan:'))) {
            const parts = line.split(':');
            if (parts.length > 1) {
                data.pesan = parts.slice(1).join(':').trim();
            }
        }
    }
    
    return data;
};

// Fungsi untuk validasi form
const validateForm = (data, type = 'complaint') => {
    const errors = [];
    
    if (!data.nama || data.nama.trim().length < 2) {
        errors.push('Nama harus diisi (minimal 2 karakter)');
    }
    
    if (!data.nomor_hp || data.nomor_hp.replace(/\D/g, '').length < 10) {
        errors.push('Nomor HP harus diisi (minimal 10 digit)');
    }
    
    if (type === 'complaint') {
        if (!data.alasan || data.alasan.trim().length < 10) {
            errors.push('Alasan komplain harus diisi (minimal 10 karakter)');
        }
    } else if (type === 'feedback') {
        if (!data.pesan || data.pesan.trim().length < 10) {
            errors.push('Pesan harus diisi (minimal 10 karakter)');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/* =========================
   EVENT HANDLERS
========================= */

// QR Code handler yang fixed untuk Railway
client.on('qr', qr => {
    console.log('\n══════════════════════════════════════════');
    console.log('📱 QR CODE UNTUK LOGIN WHATSAPP');
    console.log('══════════════════════════════════════════');
    
    // Tampilkan link QR online
    console.log('\n🔗 BUKA LINK INI DI HP/PC LAIN:');
    console.log('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qr));
    
    console.log('\n📸 CARA SCAN:');
    console.log('1. Buka link di atas di HP');
    console.log('2. Scan QR dari gambar yang muncul');
    console.log('3. Atau scan QR teks di bawah:');
    console.log('\n══════════════════════════════════════════');
    
    // Tampilkan QR kecil
    qrcode.generate(qr, { small: true });
    
    console.log('\n══════════════════════════════════════════\n');
});

// Ready handler
client.on('ready', () => {
    console.clear();
    console.log('══════════════════════════════════════════');
    console.log('     WHATSAPP COMPLAINT BOT READY!       ');
    console.log('══════════════════════════════════════════\n');
    console.log(`🏢 ${SERVICE_INFO.nama_bisnis}`);
    console.log(`⏰ ${SERVICE_INFO.jam_operasional}`);
    console.log(`📦 Produk: ${Object.keys(PRICE_LIST).length} items`);
    console.log(`📞 Admin: ${ADMIN_NUMBER}`);
    console.log(`🕒 ${new Date().toLocaleString('id-ID')}`);
    console.log(`🚫 Anti-Spam: Aktif (${SPAM_LIMIT} pesan/${SPAM_TIME_WINDOW/1000} detik)`);
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

/* =========================
   MAIN MESSAGE HANDLER
========================= */
client.on('message', async (msg) => {
    console.log(`\n📨 [${new Date().toLocaleTimeString()}] From: ${msg.from}`);
    console.log(`💬 Message: ${msg.body?.substring(0, 50) || '(no text)'}`);
    
    try {
        // Skip bot's own messages
        if (msg.fromMe) return;
        
        const from = msg.from;
        const text = (msg.body || '').trim();
        const textLower = text.toLowerCase();
        
        // Check admin
        const isAdminUser = isAdmin(from);
        console.log(`🛠️ Admin: ${isAdminUser ? 'YES' : 'NO'}`);
        
        // Check spam untuk non-admin
        if (!isAdminUser) {
            const spamCheck = checkSpam(from);
            if (spamCheck.isBlocked) {
                console.log(`🚫 User ${from} diblokir karena spam`);
                try {
                    await msg.reply(spamCheck.message);
                } catch (e) {
                    console.error('Gagal mengirim pesan blokir:', e.message);
                }
                return;
            }
        }
        
        // Load data
        const users = loadJSON(USERS_FILE);
        const complaints = loadJSON(COMPLAINTS_FILE);
        const feedbacks = loadJSON(FEEDBACK_FILE);
        
        // Get chat
        const chat = await msg.getChat();
        
        // Typing function
        const showTyping = async (ms = 500) => {
            try {
                await chat.sendStateTyping();
                await new Promise(resolve => setTimeout(resolve, ms));
                await chat.clearState();
            } catch (e) {
                // Ignore typing errors
            }
        };
        
        // Reply with typing and random delay
        const reply = async (message, typingTime = 600) => {
            await showTyping(typingTime);
            console.log(`⏳ Delay pengiriman pesan: 5-10 detik`);
            await delay(5, 10);
            return await msg.reply(message);
        };
        
        /* =========================
           ADMIN COMMANDS
        ========================= */
        if (isAdminUser) {
            
            // !list / !complaints - Show all complaints
            if (textLower === '!list' || textLower === '!complaints') {
                const allComplaints = Object.values(complaints);
                
                if (allComplaints.length === 0) {
                    await reply('📭 Belum ada komplain.');
                    return;
                }
                
                // Categorize complaints
                const pending = allComplaints.filter(c => c.status === 'MENUNGGU');
                const proses = allComplaints.filter(c => c.status === 'DIPROSES');
                const selesai = allComplaints.filter(c => c.status === 'SELESAI');
                
                let response = `📊 *DAFTAR KOMPLAIN*\n\n`;
                response += `📈 Statistik:\n`;
                response += `├─ 📥 Total: ${allComplaints.length} komplain\n`;
                response += `├─ ⏳ Menunggu: ${pending.length}\n`;
                response += `├─ 🔄 Diproses: ${proses.length}\n`;
                response += `└─ ✅ Selesai: ${selesai.length}\n\n`;
                
                // Show pending complaints
                if (pending.length > 0) {
                    response += `⏳ *MENUNGGU TINDAK LANJUT:*\n`;
                    pending.forEach((complaint, idx) => {
                        response += `${idx + 1}. *${complaint.id}*\n`;
                        response += `   👤 ${complaint.nama}\n`;
                        response += `   📱 ${complaint.nomor_hp}\n`;
                        response += `   📝 ${complaint.alasan.substring(0, 30)}...\n`;
                        response += `   ⏰ ${new Date(complaint.createdAt).toLocaleString('id-ID')}\n`;
                        response += `   └─ Balas: *!reply ${complaint.id} <pesan>*\n\n`;
                    });
                }
                
                await reply(response, 1000);
                return;
            }
            
            // !reply - Reply to complaint
            if (textLower.startsWith('!reply')) {
                const parts = text.split(' ');
                if (parts.length < 3) {
                    await reply('❌ Format: !reply <complaint_id> <pesan>\nContoh: !reply CMP240112001 Kami sedang proses perbaikannya');
                    return;
                }
                
                const complaintId = parts[1];
                const replyMessage = parts.slice(2).join(' ');
                
                // Find complaint
                const complaint = complaints[complaintId];
                if (!complaint) {
                    await reply(`❌ Komplain tidak ditemukan: ${complaintId}`);
                    return;
                }
                
                // Update complaint
                complaint.status = 'DIPROSES';
                complaint.lastRepliedAt = new Date().toISOString();
                complaint.replies = complaint.replies || [];
                complaint.replies.push({
                    from: 'admin',
                    message: replyMessage,
                    timestamp: new Date().toISOString()
                });
                complaints[complaintId] = complaint;
                
                saveJSON(COMPLAINTS_FILE, complaints);
                
                // Send reply to customer
                try {
                    const customerChat = await client.getChatById(complaint.userId);
                    await delay(5, 10);
                    await customerChat.sendMessage(
`📨 *BALASAN UNTUK KOMPLAIN ANDA*

🆔 ID Komplain: *${complaint.id}*
👤 Nama: ${complaint.nama}
📅 Tanggal Komplain: ${new Date(complaint.createdAt).toLocaleString('id-ID')}

💬 *Balasan Admin:*
${replyMessage}

📊 Status: DIPROSES
📞 Info lebih lanjut bisa hubungi kami.

Terima kasih atas pengertiannya. 🙏`
                    );
                } catch (error) {
                    console.error('Failed to notify customer:', error.message);
                }
                
                await reply(
`✅ *BALASAN TERKIRIM!*

🆔 ID: ${complaintId}
👤 Customer: ${complaint.nama}
📱 Phone: ${complaint.nomor_hp}
📝 Isi: ${replyMessage.substring(0, 50)}...

✅ Customer telah dinotifikasi.`
                );
                return;
            }
            
            // !done - Mark complaint as done
            if (textLower.startsWith('!done')) {
                const complaintId = text.split(' ')[1];
                
                if (!complaintId) {
                    await reply('❌ Format: !done <complaint_id>\nContoh: !done CMP240112001');
                    return;
                }
                
                // Find complaint
                const complaint = complaints[complaintId];
                if (!complaint) {
                    await reply(`❌ Komplain tidak ditemukan: ${complaintId}`);
                    return;
                }
                
                // Update complaint
                complaint.status = 'SELESAI';
                complaint.resolvedAt = new Date().toISOString();
                complaint.resolvedBy = from;
                complaints[complaintId] = complaint;
                
                saveJSON(COMPLAINTS_FILE, complaints);
                
                // Notify customer
                try {
                    const customerChat = await client.getChatById(complaint.userId);
                    await delay(5, 10);
                    await customerChat.sendMessage(
`✅ *KOMPLAIN ANDA TELAH DISELESAIKAN*

🆔 ID Komplain: *${complaint.id}*
👤 Nama: ${complaint.nama}
📅 Tanggal Komplain: ${new Date(complaint.createdAt).toLocaleString('id-ID')}
✅ Tanggal Selesai: ${new Date().toLocaleString('id-ID')}

📊 Status: SELESAI

Terima kasih telah memberikan masukan kepada kami.
Kami akan terus berusaha memberikan pelayanan terbaik! 🌟`
                    );
                } catch (error) {
                    console.error('Failed to notify customer:', error.message);
                }
                
                await reply(
`✅ *KOMPLAIN DISELESAIKAN!*

🆔 ID: ${complaintId}
👤 Customer: ${complaint.nama}
📱 Phone: ${complaint.nomor_hp}
📅 Resolved: ${new Date().toLocaleString('id-ID')}

✅ Customer telah dinotifikasi.`
                );
                return;
            }
            
            // !feedback - View all feedback
            if (textLower === '!feedback' || textLower === '!ulasan') {
                const allFeedback = Object.values(feedbacks);
                
                if (allFeedback.length === 0) {
                    await reply('📭 Belum ada kesan & pesan.');
                    return;
                }
                
                const today = new Date().toDateString();
                const todayFeedback = allFeedback.filter(f => 
                    new Date(f.createdAt).toDateString() === today
                );
                
                let response = `💌 *KESAN & PESAN PELANGGAN*\n\n`;
                response += `📊 Statistik:\n`;
                response += `├─ 📥 Total: ${allFeedback.length} ulasan\n`;
                response += `├─ 📅 Hari ini: ${todayFeedback.length}\n`;
                response += `└─ ⭐ Rata-rata: ${allFeedback.length > 0 ? '❤️'.repeat(Math.min(5, Math.floor(allFeedback.length/2))) : 'Belum ada rating'}\n\n`;
                
                // Show recent feedback
                const recentFeedback = allFeedback.slice(-5).reverse();
                response += `📝 *TERBARU:*\n`;
                recentFeedback.forEach((feedback, idx) => {
                    response += `${idx + 1}. *${feedback.id}*\n`;
                    response += `   👤 ${feedback.nama}\n`;
                    response += `   📱 ${feedback.nomor_hp}\n`;
                    response += `   💬 "${feedback.pesan.substring(0, 30)}..."\n`;
                    response += `   ⏰ ${new Date(feedback.createdAt).toLocaleString('id-ID')}\n\n`;
                });
                
                if (allFeedback.length > 5) {
                    response += `📖 Total ${allFeedback.length} ulasan tersimpan.`;
                }
                
                await reply(response);
                return;
            }
            
            // !stats - Statistics
            if (textLower === '!stats' || textLower === 'statistik') {
                const allComplaints = Object.values(complaints);
                const allFeedback = Object.values(feedbacks);
                const today = new Date().toDateString();
                
                const todayComplaints = allComplaints.filter(c => 
                    new Date(c.createdAt).toDateString() === today
                );
                const todayFeedback = allFeedback.filter(f => 
                    new Date(f.createdAt).toDateString() === today
                );
                
                await reply(
`📈 *STATISTIK LAYANAN*

🏢 ${SERVICE_INFO.nama_bisnis}
⏰ ${SERVICE_INFO.jam_operasional}

📊 *KOMPLAIN:*
├─ Total: ${allComplaints.length} komplain
├─ Hari ini: ${todayComplaints.length}
├─ Menunggu: ${allComplaints.filter(c => c.status === 'MENUNGGU').length}
├─ Diproses: ${allComplaints.filter(c => c.status === 'DIPROSES').length}
└─ Selesai: ${allComplaints.filter(c => c.status === 'SELESAI').length}

💌 *ULASAN:*
├─ Total: ${allFeedback.length} ulasan
└─ Hari ini: ${todayFeedback.length}

👥 *PENGGUNA:*
└─ Total: ${Object.keys(users).length} user

🚫 *ANTI-SPAM:*
Aktif - Limit: ${SPAM_LIMIT} pesan/${SPAM_TIME_WINDOW/1000} detik

📦 *PRODUK:*
└─ Total: ${Object.keys(PRICE_LIST).length} produk digital

📅 Update: ${new Date().toLocaleString('id-ID')}`
                );
                return;
            }
            
            // !unblock - Unblock user
            if (textLower.startsWith('!unblock')) {
                const userId = text.split(' ')[1];
                if (!userId) {
                    await reply('❌ Format: !unblock <user_id>\nContoh: !unblock 6281234567890@c.us');
                    return;
                }
                
                if (spamTracker.has(userId)) {
                    spamTracker.delete(userId);
                    await reply(`✅ User ${userId} telah di-unblock.`);
                } else {
                    await reply(`ℹ️ User ${userId} tidak ditemukan dalam daftar blokir.`);
                }
                return;
            }
            
            // !admin - Help menu
            if (textLower === '!admin' || textLower === 'help') {
                await reply(
`👨‍💼 *PERINTAH ADMIN*

📋 DATA & STATS:
• !list / !complaints - Lihat semua komplain
• !feedback - Lihat kesan & pesan
• !stats - Statistik layanan

💬 RESPON KOMPLAIN:
• !reply <id> <pesan> - Balas komplain
• !done <id> - Tandai selesai

🚫 ANTI-SPAM:
• !unblock <user_id> - Unblock user

🔧 LAINNYA:
• ping - Test koneksi
• !debug - Info debug

📝 CONTOH:
!reply CMP240112001 Kami sedang proses
!done CMP240112001
!unblock 6281234567890@c.us`
                );
                return;
            }
            
            // Ping test
            if (textLower === 'ping') {
                await reply(`🏓 Pong! Bot aktif sejak ${new Date().toLocaleString()}`);
                return;
            }
            
            // Default admin response
            await reply(`👋 Hai Admin! Ketik "!admin" untuk melihat perintah.`);
            return;
        }
        
        /* =========================
           USER COMMANDS
        ========================= */
        
        // New user welcome
        if (!users[from]) {
            users[from] = {
                name: msg._data?.notifyName || 'Customer',
                phone: from,
                joined: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                complaintStage: null,
                feedbackStage: null,
                complaintData: {},
                feedbackData: {}
            };
            saveJSON(USERS_FILE, users);
        }
        
        const user = users[from];
        user.lastActive = new Date().toISOString();
        
        // Main menu
        if (textLower === 'menu' || textLower === 'help' || text === '0' || text === 'start' || text === 'hai') {
            user.complaintStage = null;
            user.feedbackStage = null;
            saveJSON(USERS_FILE, users);
            
            await reply(
`👋 *SELAMAT DATANG DI ${SERVICE_INFO.nama_bisnis}* 👋

📦 *TOKO PRODUK DIGITAL TERPERCAYA*
🕒 Jam Operasional: ${SERVICE_INFO.jam_operasional}
📍 ${SERVICE_INFO.alamat}
📞 ${SERVICE_INFO.kontak}

📋 *MENU LAYANAN:*
1️⃣ *LIST HARGA* - Lihat daftar harga produk digital
2️⃣ *SNK* - Syarat & Ketentuan Pembelian
3️⃣ *KOMPLAIN* - Kirim keluhan/pengaduan
4️⃣ *KESAN PESAN* - Beri masukan untuk kami
5️⃣ *HUBUNGI ADMIN* - Informasi kontak admin

🔧 *PERINTAH LAIN:*
• status - Cek status komplain
• batal - Batalkan proses

⚠️ *PERHATIAN:*
• Jangan spam chat (maksimal ${SPAM_LIMIT} pesan dalam ${SPAM_TIME_WINDOW/1000} detik)
• Pelanggaran akan di-blokir 24 jam

📌 *KETIK ANGKA (1-5)* untuk memilih menu`
            );
            return;
        }
        
        // Menu 1: List Harga
        if (text === '1' || textLower === 'harga' || textLower === 'price' || textLower === 'list harga') {
            let priceListMessage = `💰 *DAFTAR HARGA PRODUK DIGITAL*\n\n`;
            
            Object.entries(PRICE_LIST).forEach(([key, product]) => {
                priceListMessage += `${key}. *${product.name}*\n`;
                priceListMessage += `   💰 Rp${product.price.toLocaleString('id-ID')}\n`;
                priceListMessage += `   📝 ${product.description}\n`;
                priceListMessage += `   🎯 ${product.features.slice(0, 3).join(', ')}\n\n`;
            });
            
            priceListMessage += `💡 *INFORMASI PEMBELIAN:*\n`;
            priceListMessage += `• Transfer via bank/QRIS\n`;
            priceListMessage += `• Proses 1-24 jam setelah konfirmasi\n`;
            priceListMessage += `• Garansi 3 hari untuk masalah teknis\n`;
            priceListMessage += `• Support via WhatsApp selama masa aktif\n\n`;
            priceListMessage += `📞 Untuk pemesanan, hubungi admin via menu 5\n`;
            priceListMessage += `Ketik *menu* untuk kembali ke menu utama`;
            
            await reply(priceListMessage);
            return;
        }
        
        // Menu 2: SNK
        if (text === '2' || textLower === 'snk' || textLower === 'syarat' || textLower === 'ketentuan') {
            await reply(SNK_CONTENT);
            return;
        }
        
        // Menu 3: Komplain - SISTEM 1 PESAN
        if (text === '3' || textLower === 'komplain' || textLower === 'keluhan' || textLower === 'pengaduan') {
            await reply(
`📝 *FORMULIR KOMPLAIN / PENGADUAN*

Ketik komplain Anda dalam *SATU PESAN* dengan format:

*FORMAT:*
Nama: [Nama Lengkap Anda]
No HP: [Nomor WhatsApp]
Alasan: [Jelaskan keluhan Anda]

*CONTOH:*
Nama: Budi Santoso
No HP: 081234567890
Alasan: Canva Pro yang saya beli tidak bisa login sejak kemarin. Sudah coba reset password tetap tidak bisa.

📸 *BUKTI (OPTIONAL):*
Setelah kirim form, bisa kirim bukti (screenshot) di pesan berikutnya.

⚠️ *CATATAN:*
• Semua data dalam 1 pesan
• Pastikan nomor HP aktif
• Jelaskan dengan jelas
• Sertakan nama produk

🚫 *JANGAN SPAM:* Maks ${SPAM_LIMIT} pesan/${SPAM_TIME_WINDOW/1000} detik

Kirim komplain Anda sekarang atau ketik *batal*.`
            );
            
            user.complaintStage = 'waiting_for_full_complaint';
            saveJSON(USERS_FILE, users);
            return;
        }
        
        // Menu 4: Kesan Pesan - SISTEM 1 PESAN
        if (text === '4' || textLower === 'kesan' || textLower === 'pesan' || textLower === 'ulasan' || textLower === 'feedback') {
            await reply(
`💌 *FORMULIR KESAN & PESAN*

Ketik kesan & pesan Anda dalam *SATU PESAN* dengan format:

*FORMAT:*
Nama: [Nama Lengkap Anda]
No HP: [Nomor WhatsApp]
Pesan: [Tuliskan kesan & pesan Anda]

*CONTOH:*
Nama: Siti Rahayu
No HP: 081987654321
Pesan: Pelayanan sangat memuaskan, respon cepat dan ramah. Harga terjangkau dengan kualitas terbaik.

⚠️ *CATATAN:*
• Semua data dalam 1 pesan
• Pastikan nomor HP valid
• Berikan masukan yang membangun

Kirim kesan & pesan Anda sekarang atau ketik *batal*.`
            );
            
            user.feedbackStage = 'waiting_for_full_feedback';
            saveJSON(USERS_FILE, users);
            return;
        }
        
        // Menu 5: Hubungi Admin
        if (text === '5' || textLower === 'hubungi admin' || textLower === 'kontak admin' || textLower === 'admin') {
            await reply(
`👨‍💼 *HUBUNGI ADMIN*

*INFORMASI KONTAK:*
📱 WhatsApp: https://wa.me/${ADMIN_NUMBER}
☎️ Telepon: ${ADMIN_NUMBER}
📍 ${SERVICE_INFO.alamat}
🕒 ${SERVICE_INFO.jam_operasional}

💬 *LAYANAN YANG BISA DIBANTU:*
✅ Informasi produk & harga
✅ Pemesanan produk digital
✅ Konfirmasi pembayaran
✅ Bantuan teknis akun
✅ Informasi promo & diskon

📌 *TIPS AGAR CEPAT DIBALAS:*
1. Sertakan ID Komplain jika ada
2. Sebutkan produk yang diminati
3. Jelaskan kebutuhan dengan jelas

📦 *PRODUK YANG TERSEDIA:*
${Object.values(PRICE_LIST).slice(0, 5).map(p => `• ${p.name}`).join('\n')}
...dan lainnya (lihat menu 1)

Klik link di atas untuk chat langsung dengan admin! 🚀

📋 Kembali ke menu: ketik *menu*`
            );
            return;
        }
        
        // Cek status komplain
        if (textLower === 'status' || textLower === 'cek status') {
            const userComplaints = Object.values(complaints).filter(c => c.userId === from);
            
            if (userComplaints.length === 0) {
                await reply(
`📊 *STATUS KOMPLAIN*

Anda belum pernah mengirim komplain.

Ingin mengirim komplain?
Ketik *3* atau *komplain*`
                );
                return;
            }
            
            let statusMessage = `📊 *STATUS KOMPLAIN ANDA*\n\n`;
            statusMessage += `Total komplain: ${userComplaints.length}\n\n`;
            
            // Show recent complaints
            const recentComplaints = userComplaints.slice(-3).reverse();
            recentComplaints.forEach((complaint, idx) => {
                let emoji = '⏳';
                if (complaint.status === 'SELESAI') emoji = '✅';
                if (complaint.status === 'DIPROSES') emoji = '🔄';
                
                statusMessage += `${idx + 1}. ${emoji} *${complaint.id}*\n`;
                statusMessage += `   📅 ${new Date(complaint.createdAt).toLocaleString('id-ID')}\n`;
                statusMessage += `   📝 ${complaint.alasan.substring(0, 30)}...\n`;
                statusMessage += `   📊 Status: *${complaint.status}*\n`;
                
                if (complaint.replies && complaint.replies.length > 0) {
                    const lastReply = complaint.replies[complaint.replies.length - 1];
                    statusMessage += `   💬 Balasan terakhir: ${lastReply.message.substring(0, 30)}...\n`;
                }
                
                statusMessage += `\n`;
            });
            
            statusMessage += `Ketik *menu* untuk kembali ke menu utama`;
            
            await reply(statusMessage);
            return;
        }
        
        // Batal command
        if (textLower === 'batal' || textLower === 'cancel') {
            if (user.complaintStage || user.feedbackStage) {
                user.complaintStage = null;
                user.feedbackStage = null;
                user.complaintData = {};
                user.feedbackData = {};
                saveJSON(USERS_FILE, users);
                
                await reply('❌ Proses dibatalkan. Ketik *menu* untuk kembali ke menu utama.');
            } else {
                await reply('⚠️ Tidak ada proses yang sedang berjalan. Ketik *menu* untuk melihat pilihan.');
            }
            return;
        }
        
        /* =========================
           COMPLAINT FORM PROCESSING
        ========================= */
        if (user.complaintStage === 'waiting_for_full_complaint') {
            // Proses komplain lengkap dalam 1 pesan
            
            // Extract data dari pesan
            const complaintData = extractFormData(text, 'complaint');
            
            // Validasi data
            const validation = validateForm(complaintData, 'complaint');
            
            if (!validation.isValid) {
                await reply(
`❌ *FORMAT KOMPLAIN TIDAK VALID*

*Kesalahan:*
${validation.errors.map(err => `• ${err}`).join('\n')}

*CONTOH FORMAT YANG BENAR:*
Nama: Budi Santoso
No HP: 081234567890
Alasan: Canva Pro tidak bisa diakses sejak kemarin.

Silakan kirim ulang dengan format yang benar atau ketik *batal*.`
                );
                return;
            }
            
            // Simpan data sementara
            user.complaintData = complaintData;
            user.complaintStage = 'waiting_for_proof';
            saveJSON(USERS_FILE, users);
            
            await reply(
`✅ *DATA KOMPLAIN DITERIMA!*

📋 *Ringkasan Data:*
👤 Nama: ${complaintData.nama}
📱 No HP: ${complaintData.nomor_hp}
📝 Alasan: ${complaintData.alasan.substring(0, 80)}...

📸 *BUKTI PENDUKUNG (OPTIONAL)*
Anda bisa kirim bukti pendukung dalam pesan berikutnya:
• Screenshot error
• Bukti transaksi  
• atau bukti lainnya

Kirim bukti sekarang atau ketik *lanjut* untuk lanjut tanpa bukti.

Ketik *batal* untuk membatalkan.`
            );
            return;
        }
        
        if (user.complaintStage === 'waiting_for_proof') {
            // User mengirim bukti atau memilih lanjut
            const complaintId = generateComplaintId();
            const complaintData = user.complaintData;
            
            // Create complaint object
            const newComplaint = {
                id: complaintId,
                userId: from,
                nama: complaintData.nama,
                nomor_hp: complaintData.nomor_hp,
                alasan: complaintData.alasan,
                status: 'MENUNGGU',
                createdAt: new Date().toISOString(),
                replies: []
            };
            
            // Handle media jika ada
            let hasProof = false;
            if (msg.hasMedia && textLower !== 'lanjut') {
                try {
                    const media = await msg.downloadMedia();
                    newComplaint.media = {
                        mimetype: media.mimetype,
                        data: media.data,
                        filename: `bukti_${complaintId}.${media.mimetype.split('/')[1] || 'jpg'}`
                    };
                    hasProof = true;
                    console.log('✅ Bukti komplain diterima');
                } catch (error) {
                    console.error('Error downloading media:', error);
                }
            }
            
            // Save complaint
            complaints[complaintId] = newComplaint;
            saveJSON(COMPLAINTS_FILE, complaints);
            
            // Clear user data
            user.complaintStage = null;
            user.complaintData = {};
            saveJSON(USERS_FILE, users);
            
            // Send confirmation to user
            await reply(
`✅ *KOMPLAIN BERHASIL DIKIRIM!* 🎉

🆔 ID Komplain: *${complaintId}*
👤 Nama: ${newComplaint.nama}
📱 No HP: ${newComplaint.nomor_hp}
📅 Tanggal: ${new Date().toLocaleString('id-ID')}
📝 Alasan: ${newComplaint.alasan.substring(0, 100)}...
${hasProof ? '📸 Bukti: ✅ Terlampir' : '📸 Bukti: ❌ Tidak ada'}
📊 Status: MENUNGGU

⏰ *PROSES:*
Admin akan merespon dalam 1x24 jam.
Anda akan mendapat notifikasi via WhatsApp.

🔍 *Cek Status:* ketik *status*
📋 Kembali ke menu: ketik *menu*

Terima kasih atas masukan Anda! 🙏`
            );
            
            // Notify admin
            try {
                const adminMessage = 
`📨 *KOMPLAIN BARU DITERIMA!*

🆔 ID: ${complaintId}
👤 Nama: ${newComplaint.nama}
📱 Phone: ${newComplaint.nomor_hp}
📅 Waktu: ${new Date().toLocaleString('id-ID')}

📝 *ISI KOMPLAIN:*
${newComplaint.alasan}

📊 Status: MENUNGGU
${hasProof ? '📸 Bukti: ✅ Terlampir' : '📸 Bukti: ❌ Tidak ada'}

💬 *BALAS DENGAN:*
!reply ${complaintId} <pesan_balasan>
!done ${complaintId}`;

                console.log(`📤 Mengirim notifikasi ke admin: ${ADMIN_NUMBER}`);
                
                // Kirim ke admin
                if (newComplaint.media && hasProof) {
                    await client.sendMessage(
                        ADMIN_NUMBER + '@c.us',
                        {
                            media: Buffer.from(newComplaint.media.data, 'base64'),
                            mimetype: newComplaint.media.mimetype,
                            filename: newComplaint.media.filename
                        },
                        { caption: adminMessage }
                    );
                } else {
                    await client.sendMessage(
                        ADMIN_NUMBER + '@c.us',
                        adminMessage
                    );
                }
                
            } catch (error) {
                console.error('❌ Gagal mengirim notifikasi ke admin:', error.message);
                
                // Backup
                try {
                    await client.sendMessage(
                        ADMIN_NUMBER + '@c.us',
                        `⚠️ ADA KOMPLAIN BARU!\nID: ${complaintId}\nNama: ${newComplaint.nama}`
                    );
                } catch (e) {
                    console.error('Gagal mengirim pesan error:', e.message);
                }
            }
            return;
        }
        
        /* =========================
           FEEDBACK FORM PROCESSING
        ========================= */
        if (user.feedbackStage === 'waiting_for_full_feedback') {
            // Proses feedback lengkap dalam 1 pesan
            
            // Extract data dari pesan
            const feedbackData = extractFormData(text, 'feedback');
            
            // Validasi data
            const validation = validateForm(feedbackData, 'feedback');
            
            if (!validation.isValid) {
                await reply(
`❌ *FORMAT KESAN & PESAN TIDAK VALID*

*Kesalahan:*
${validation.errors.map(err => `• ${err}`).join('\n')}

*CONTOH FORMAT YANG BENAR:*
Nama: Siti Rahayu
No HP: 081987654321
Pesan: Pelayanan sangat memuaskan, respon cepat.

Silakan kirim ulang dengan format yang benar atau ketik *batal*.`
                );
                return;
            }
            
            const feedbackId = generateFeedbackId();
            
            // Create feedback object
            const newFeedback = {
                id: feedbackId,
                userId: from,
                nama: feedbackData.nama,
                nomor_hp: feedbackData.nomor_hp,
                pesan: feedbackData.pesan,
                createdAt: new Date().toISOString()
            };
            
            // Save feedback
            feedbacks[feedbackId] = newFeedback;
            saveJSON(FEEDBACK_FILE, feedbacks);
            
            // Clear user data
            user.feedbackStage = null;
            user.feedbackData = {};
            saveJSON(USERS_FILE, users);
            
            // Send confirmation to user
            await reply(
`💌 *TERIMA KASIH ATAS KESAN & PESANNYA!*

🆔 ID Ulasan: *${feedbackId}*
👤 Nama: ${newFeedback.nama}
📱 Nomor HP: ${newFeedback.nomor_hp}
📅 Tanggal: ${new Date().toLocaleString('id-ID')}

🌟 *Pesan Anda:*
"${newFeedback.pesan.substring(0, 100)}..."

Kami sangat menghargai masukan dari Anda.
Ini akan membantu kami menjadi lebih baik! 🙏

📋 Kembali ke menu: ketik *menu*`
            );
            
            // Notify admin
            try {
                await client.sendMessage(
                    ADMIN_NUMBER + '@c.us',
`💌 *KESAN & PESAN BARU!*

🆔 ID: ${feedbackId}
👤 Nama: ${newFeedback.nama}
📱 Phone: ${newFeedback.nomor_hp}
📅 Waktu: ${new Date().toLocaleString('id-ID')}

💬 *Isi Pesan:*
"${newFeedback.pesan}"

🌟 Terima kasih atas masukan pelanggan!`
                );
                console.log('✅ Notifikasi feedback terkirim ke admin');
            } catch (error) {
                console.error('Failed to notify admin:', error.message);
            }
            return;
        }
        
        // Unknown command
        if (text.trim() !== '') {
            await reply(
`🤖 *BOT RESPONSE*

Perintah tidak dikenali: "${text.substring(0, 30)}"

📋 Silakan pilih menu:
• Ketik *menu* untuk menu utama
• Ketik *1* untuk list harga
• Ketik *2* untuk SNK
• Ketik *3* untuk komplain
• Ketik *4* untuk kesan pesan
• Ketik *5* untuk hubungi admin
• Ketik *status* untuk cek status komplain
• Ketik *batal* untuk membatalkan.

⚠️ *PERHATIAN:* Jangan spam chat!`
            );
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack trace:', error.stack);
        try {
            await msg.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi atau ketik *menu*.');
        } catch (e) {
            console.error('Failed to send error reply:', e);
        }
    }
});

/* =========================
   START BOT WITH RETRY
========================= */
const initializeWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`\n🔄 Mencoba inisialisasi ke-${i + 1}...`);
            await client.initialize();
            console.log('✅ WhatsApp Bot berhasil diinisialisasi!');
            return;
        } catch (error) {
            console.error(`❌ Inisialisasi gagal (attempt ${i + 1}):`, error.message);
            
            if (i < retries - 1) {
                console.log(`⏳ Menunggu ${delay/1000} detik sebelum mencoba lagi...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5;
            }
        }
    }
    console.error('🚨 Gagal menginisialisasi WhatsApp Bot setelah beberapa percobaan');
    process.exit(1);
};

// Start the bot
console.log('\n🚀 Starting WhatsApp Complaint Bot...');
console.log('══════════════════════════════════════════');
initializeWithRetry();