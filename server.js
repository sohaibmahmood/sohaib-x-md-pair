const express = require('express');
const https   = require('https');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

// ── Constants ────────────────────────────────────────────────────────────────
const PORT          = process.env.PORT || 3000;
const TEMP_DIR      = path.join(__dirname, 'temp_sessions');
const MAX_SESSIONS  = 3;          // Max concurrent WA sockets (RAM protection)
const SESSION_TTL   = 3 * 60_000; // Auto-kill session after 3 minutes (180s)

// ── State ─────────────────────────────────────────────────────────────────────
const ACTIVE_SESSIONS = new Map();

// ── WA Version Cache (FLASH OPTIMIZATION) ─────────────────────────────────────
// Pre-fetch once at startup so each user's session starts INSTANTLY
// instead of making a slow GitHub API call (~1-2s) per pairing request.
let cachedWAVersion = null;
fetchLatestBaileysVersion()
    .then(({ version }) => {
        cachedWAVersion = version;
        console.log(`⚡ WA version cached: [${version}] — all sessions will start instantly!`);
    })
    .catch(() => {
        cachedWAVersion = [2, 3000, 1035194821]; // Known-good fallback version
        console.warn('⚠️ Could not fetch WA version — using fallback.');
    });

// Refresh version every 6 hours to stay current
setInterval(() => {
    fetchLatestBaileysVersion()
        .then(({ version }) => { cachedWAVersion = version; })
        .catch(() => {});
}, 6 * 60 * 60_000);

// ── Startup: clean any leftover temp dirs from previous crash ─────────────────
fs.mkdirSync(TEMP_DIR, { recursive: true });
try {
    const leftover = fs.readdirSync(TEMP_DIR);
    for (const d of leftover) {
        try { fs.rmSync(path.join(TEMP_DIR, d), { recursive: true, force: true }); } catch (e) {}
    }
    if (leftover.length) console.log(`🧹 Cleaned ${leftover.length} orphaned session(s) from previous run.`);
} catch (e) {}

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limit: max 5 requests per IP per 10 min
const pairingLimiter = rateLimit({
    windowMs: 10 * 60_000,
    max: 5,
    message: { error: 'Too many attempts. Please wait 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ── Health / Stats ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
        status:         'ok',
        activeSessions: ACTIVE_SESSIONS.size,
        maxSessions:    MAX_SESSIONS,
        memoryMB: {
            rss:      (mem.rss      / 1024 / 1024).toFixed(1),
            heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1),
            heapTotal:(mem.heapTotal/ 1024 / 1024).toFixed(1),
        },
        uptime: Math.floor(process.uptime()) + 's',
        bot:    'ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑'
    });
});

// ── Session cleanup helper ─────────────────────────────────────────────────────
function destroySession(sessionId, sessionDir, sock) {
    ACTIVE_SESSIONS.delete(sessionId);
    // Gracefully terminate the WA socket
    try { sock?.ws?.close(); } catch (e) {}
    try { sock?.end(undefined); } catch (e) {}
    // Delete temp creds from disk after short delay
    setTimeout(() => {
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}
    }, 3000);
}

// ── SSE Pairing Endpoint ───────────────────────────────────────────────────────
app.get('/api/pair', pairingLimiter, async (req, res) => {

    // ── RAM Guard: reject if too many active sessions ──────────────────────────
    if (ACTIVE_SESSIONS.size >= MAX_SESSIONS) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Server busy — ${ACTIVE_SESSIONS.size} sessions active. Please try again in 1–2 minutes.` })}\n\n`);
        return res.end();
    }

    // ── SSE setup ──────────────────────────────────────────────────────────────
    res.writeHead(200, {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
    });

    const sendSSE = (type, data = {}) => {
        try { if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`); } catch (e) {}
    };

    // Keep-alive comment ping every 20 s (prevents proxy/Railway timeout)
    const keepAlive = setInterval(() => {
        try { if (!res.writableEnded) res.write(': ping\n\n'); } catch (e) { clearInterval(keepAlive); }
    }, 20_000);

    // ── Input validation ───────────────────────────────────────────────────────
    const method   = req.query.method || '';
    const number   = (req.query.number || '').replace(/\D/g, '');
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    if (!['qr', 'code'].includes(method)) {
        sendSSE('error', { message: 'Invalid method. Use qr or code.' });
        clearInterval(keepAlive);
        return res.end();
    }
    if (method === 'code' && (!number || number.length < 7 || number.length > 15)) {
        sendSSE('error', { message: 'Valid phone number with country code required (e.g. 923148740994).' });
        clearInterval(keepAlive);
        return res.end();
    }

    // ── Session dir ────────────────────────────────────────────────────────────
    const sessionId  = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sessionDir = path.join(TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    let isClosed = false;
    let sock     = null;
    let pairingCodeRequested = false;

    // ── Master cleanup ─────────────────────────────────────────────────────────
    const cleanup = (reason = '') => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(keepAlive);
        if (ttlTimer) clearTimeout(ttlTimer);
        destroySession(sessionId, sessionDir, sock);
        if (reason) console.log(`[${sessionId}] Cleaned up: ${reason}. Active: ${ACTIVE_SESSIONS.size}`);
    };

    // ── Hard TTL: auto-kill after SESSION_TTL ms to prevent RAM leak ───────────
    const ttlTimer = setTimeout(() => {
        if (!isClosed) {
            sendSSE('error', { message: 'Session timed out (3 min). Please try again.' });
            cleanup('TTL expired');
            if (!res.writableEnded) res.end();
        }
    }, SESSION_TTL);

    // ── Cleanup on client disconnect ───────────────────────────────────────────
    res.on('close', () => cleanup('client disconnected'));

    // ── Register session ───────────────────────────────────────────────────────
    ACTIVE_SESSIONS.set(sessionId, { method, ip: clientIp, startedAt: Date.now() });
    console.log(`[${sessionId}] New ${method.toUpperCase()} session. Active: ${ACTIVE_SESSIONS.size}/${MAX_SESSIONS} | RAM: ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB`);

    sendSSE('status', { message: 'Initializing WhatsApp connection...', icon: '🔌' });

    try {
        // Use pre-cached version for FLASH-FAST startup (no GitHub API call per user)
        const version = cachedWAVersion || (await fetchLatestBaileysVersion()).version;
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
            version,
            auth:                 state,
            logger:               pino({ level: 'silent' }),
            printQRInTerminal:    false,
            browser:              ['Ubuntu', 'Chrome', '20.0.04'],
            connectTimeoutMs:     60_000,
            defaultQueryTimeoutMs:30_000,
            keepAliveIntervalMs:  25_000,
            retryRequestDelayMs:  250,
            // Memory savings: skip unnecessary caches
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            if (isClosed) return;
            const { connection, lastDisconnect, qr } = update;

            if (qr && method === 'qr') {
                sendSSE('qr', { qr });
                sendSSE('status', { message: 'QR Code ready — scan now!', icon: '📱' });
            }

            if (connection === 'open') {
                sendSSE('status', { message: 'Connected! Generating your Session ID...', icon: '⚡' });
                try {
                    const credsPath = path.join(sessionDir, 'creds.json');
                    let attempts = 0;
                    while (!fs.existsSync(credsPath) && attempts++ < 10) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                    if (!fs.existsSync(credsPath)) throw new Error('creds.json not written in time');

                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    const generatedId = 'STARK-MD~' + Buffer.from(JSON.stringify(creds)).toString('base64');

                    // Send to user's own WhatsApp
                    try {
                        const userJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        await sock.sendMessage(userJid, {
                            text: `╔══════════════════════╗\n║ ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑 ║\n╚══════════════════════╝\n\n✅ *SESSION ID GENERATED*\n\nPaste this as your SESSION_ID:\n\n${generatedId}\n\n⚠️ Keep this PRIVATE!`
                        });
                        sendSSE('status', { message: 'Session ID sent to your WhatsApp!', icon: '📨' });
                    } catch (sendErr) {
                        console.warn(`[${sessionId}] WA send failed (non-fatal):`, sendErr.message);
                    }

                    sendSSE('connected', { sessionId: generatedId, message: 'Session generated!' });
                } catch (e) {
                    sendSSE('error', { message: 'Failed to generate session: ' + e.message });
                }
                cleanup('pairing complete');
                if (!res.writableEnded) res.end();
            }

            if (connection === 'close' && !isClosed) {
                const code   = lastDisconnect?.error?.output?.statusCode;
                const reason = DisconnectReason[code] || code || 'Unknown';
                const msg    = code === 401 || code === 403
                    ? 'Rejected by WhatsApp. Please try again.'
                    : `Disconnected (${reason}). Please try again.`;
                sendSSE('error', { message: msg });
                cleanup(`WA close code=${code}`);
                if (!res.writableEnded) res.end();
            }
        });

        // Pairing code: request after 3 s delay
        if (method === 'code') {
            sendSSE('status', { message: 'Requesting pairing code...', icon: '🔢' });
            await new Promise(r => setTimeout(r, 3000));
            if (!isClosed && !pairingCodeRequested) {
                pairingCodeRequested = true;
                try {
                    const code      = await sock.requestPairingCode(number);
                    const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                    sendSSE('code', { code: formatted });
                    sendSSE('status', { message: 'Enter this code in WhatsApp › Linked Devices', icon: '📲' });
                } catch (err) {
                    if (!isClosed) {
                        sendSSE('error', { message: 'Pairing code failed: ' + err.message + '. Try QR instead.' });
                        cleanup('pairing code error');
                        if (!res.writableEnded) res.end();
                    }
                }
            }
        }

    } catch (e) {
        console.error(`[${sessionId}] Fatal error:`, e.message);
        if (!isClosed) sendSSE('error', { message: 'Server error: ' + e.message });
        cleanup('fatal error');
        if (!res.writableEnded) res.end();
    }
});

// ── 404 → index ────────────────────────────────────────────────────────────────
app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ Pairing Server`);
    console.log(`📡 http://0.0.0.0:${PORT}`);
    console.log(`🛡️  Max concurrent sessions: ${MAX_SESSIONS} (RAM guard)`);
    console.log(`⏱️  Session TTL: ${SESSION_TTL / 1000}s (auto-kill)`);
    console.log(`✅ Ready!\n`);

    // ── Memory monitor: log RAM every 5 min ────────────────────────────────────
    setInterval(() => {
        const m = process.memoryUsage();
        console.log(`📊 RAM: ${(m.rss/1024/1024).toFixed(0)}MB RSS | ${(m.heapUsed/1024/1024).toFixed(0)}MB heap | Sessions: ${ACTIVE_SESSIONS.size}/${MAX_SESSIONS}`);
    }, 5 * 60_000);

    // ── Self-ping keep-alive (Railway / Render) ────────────────────────────────
    const pingBase = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : (process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL);

    if (pingBase) {
        const target = pingBase.replace(/\/$/, '') + '/health';
        console.log(`🏓 Self-ping → ${target}`);
        setInterval(() => {
            try {
                const mod = target.startsWith('https') ? https : http;
                const r   = mod.get(target, () => {}).on('error', () => {});
                r.setTimeout(8000, () => r.destroy());
            } catch (e) {}
        }, 14 * 60_000);
    }
});

// ── Global error guards ────────────────────────────────────────────────────────
process.on('uncaughtException',  (e) => console.error('⚠️ Uncaught:', e.message));
process.on('unhandledRejection', (e) => console.error('⚠️ Rejection:', e));
