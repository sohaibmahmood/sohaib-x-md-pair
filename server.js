const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp_sessions');
const ACTIVE_SESSIONS = new Map(); // Track active pairing sessions

// === Middleware ===
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limit: max 5 pairing attempts per IP per 10 minutes
const pairingLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: { error: 'Too many pairing attempts. Please wait 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Ensure temp dir exists
fs.mkdirSync(TEMP_DIR, { recursive: true });

// === Health check endpoint ===
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        activeSessions: ACTIVE_SESSIONS.size,
        bot: 'ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑'
    });
});

// === SSE Pairing Endpoint ===
app.get('/api/pair', pairingLimiter, async (req, res) => {
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
        'Access-Control-Allow-Origin': '*'
    });

    const sendSSE = (type, data = {}) => {
        try {
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
            }
        } catch (e) {}
    };

    // Keep-alive ping every 20s to prevent proxy timeout
    const keepAliveInterval = setInterval(() => {
        try {
            if (!res.writableEnded) res.write(': ping\n\n');
        } catch (e) { clearInterval(keepAliveInterval); }
    }, 20000);

    const method = req.query.method; // 'qr' or 'code'
    const number = (req.query.number || '').replace(/[^0-9]/g, '');
    const clientIp = req.ip || req.socket.remoteAddress;

    // Validate inputs
    if (!method || !['qr', 'code'].includes(method)) {
        sendSSE('error', { message: 'Invalid pairing method. Use qr or code.' });
        clearInterval(keepAliveInterval);
        return res.end();
    }

    if (method === 'code' && !number) {
        sendSSE('error', { message: 'Phone number is required for pairing code method.' });
        clearInterval(keepAliveInterval);
        return res.end();
    }

    if (method === 'code' && (number.length < 7 || number.length > 15)) {
        sendSSE('error', { message: 'Invalid phone number. Include country code (e.g. 923148740994).' });
        clearInterval(keepAliveInterval);
        return res.end();
    }

    // Create unique session directory for this user
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const sessionDir = path.join(TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    let isClosed = false;
    let sock = null;
    let pairingCodeRequested = false;

    const cleanup = () => {
        isClosed = true;
        clearInterval(keepAliveInterval);
        ACTIVE_SESSIONS.delete(sessionId);
        try { sock?.end(undefined); } catch (e) {}
        // Delay cleanup to allow final reads
        setTimeout(() => {
            try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}
        }, 5000);
    };

    // Cleanup when client disconnects
    res.on('close', () => {
        if (!isClosed) cleanup();
    });

    sendSSE('status', { message: 'Initializing WhatsApp connection...', icon: '🔌' });

    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 30_000,
            keepAliveIntervalMs: 25_000,
            retryRequestDelayMs: 250
        });

        ACTIVE_SESSIONS.set(sessionId, { sock, method, ip: clientIp, startedAt: new Date() });

        sock.ev.on('creds.update', saveCreds);

        // Request pairing code after socket is ready
        sock.ev.on('connection.update', async (update) => {
            if (isClosed) return;
            const { connection, lastDisconnect, qr } = update;

            // Handle QR code delivery
            if (qr && method === 'qr') {
                sendSSE('qr', { qr });
                sendSSE('status', { message: 'QR Code ready — scan now!', icon: '📱' });
            }

            // Request pairing code once connected to WA servers (before auth)
            if (connection === 'connecting' && method === 'code' && !pairingCodeRequested && !sock.authState.creds.registered) {
                // Wait briefly for socket to be ready
            }

            if (connection === 'open') {
                // ✅ Successfully authenticated!
                sendSSE('status', { message: 'Connected! Generating your Session ID...', icon: '⚡' });

                try {
                    const credsPath = path.join(sessionDir, 'creds.json');
                    
                    // Wait for creds file to be written
                    let attempts = 0;
                    while (!fs.existsSync(credsPath) && attempts < 10) {
                        await new Promise(r => setTimeout(r, 500));
                        attempts++;
                    }

                    if (!fs.existsSync(credsPath)) {
                        throw new Error('Credentials file not found after authentication');
                    }

                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    const generatedSessionId = 'STARK-MD~' + Buffer.from(JSON.stringify(creds)).toString('base64');

                    // Send session ID to the user's own WhatsApp
                    try {
                        const userJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const message = `╔═══════════════════════╗\n║  ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑  ║\n╚═══════════════════════╝\n\n✅ *SESSION ID GENERATED*\n\nCopy the text below and paste it as your SESSION_ID:\n\n${generatedSessionId}\n\n⚠️ *Keep this private! Anyone with this ID can control your WhatsApp.*`;
                        await sock.sendMessage(userJid, { text: message });
                        sendSSE('status', { message: 'Session ID sent to your WhatsApp!', icon: '📨' });
                    } catch (sendErr) {
                        // Non-fatal — still return session ID on screen
                        console.warn('Could not send session to WhatsApp:', sendErr.message);
                    }

                    sendSSE('connected', {
                        sessionId: generatedSessionId,
                        message: 'Session generated successfully!'
                    });
                } catch (e) {
                    sendSSE('error', { message: 'Failed to generate session: ' + e.message });
                }

                cleanup();
                if (!res.writableEnded) res.end();
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = DisconnectReason[statusCode] || statusCode || 'Unknown';

                if (!isClosed) {
                    if (statusCode === 401 || statusCode === 403) {
                        sendSSE('error', { message: 'Session rejected by WhatsApp. Please try again.' });
                    } else if (statusCode === 408) {
                        sendSSE('error', { message: 'Connection timed out. Please try again.' });
                    } else {
                        sendSSE('error', { message: `Disconnected (${reason}). Please try again.` });
                    }
                    cleanup();
                    if (!res.writableEnded) res.end();
                }
            }
        });

        // For pairing code method — request code after small delay
        if (method === 'code') {
            sendSSE('status', { message: 'Requesting pairing code...', icon: '🔢' });
            await new Promise(r => setTimeout(r, 3000));

            if (!isClosed && !pairingCodeRequested) {
                pairingCodeRequested = true;
                try {
                    const code = await sock.requestPairingCode(number);
                    // Format code as XXXX-XXXX
                    const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                    sendSSE('code', { code: formatted });
                    sendSSE('status', { message: 'Enter this code in WhatsApp > Linked Devices', icon: '📲' });
                } catch (err) {
                    if (!isClosed) {
                        sendSSE('error', { message: 'Failed to request pairing code: ' + err.message + '. Try QR method instead.' });
                        cleanup();
                        if (!res.writableEnded) res.end();
                    }
                }
            }
        }

    } catch (e) {
        console.error('Pairing server error:', e);
        if (!isClosed) {
            sendSSE('error', { message: 'Server error: ' + e.message });
            clearInterval(keepAliveInterval);
        }
        cleanup();
        if (!res.writableEnded) res.end();
    }
});

// === Stats endpoint (admin info) ===
app.get('/api/stats', (req, res) => {
    res.json({
        activePairingSessions: ACTIVE_SESSIONS.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
    });
});

// === 404 fallback to index.html ===
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ Pairing Server`);
    console.log(`📡 Running at http://0.0.0.0:${PORT}`);
    console.log(`🔒 Rate limiting: 5 sessions per IP per 10 minutes`);
    console.log(`✅ Ready to generate sessions!\n`);
});

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
