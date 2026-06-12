# ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ — Pairing Server

A standalone, publicly-hostable WhatsApp session generator. Each user gets their own unique, isolated session.

## 🚀 Deploy in 2 Minutes (Railway — Recommended Free Host)

### Step 1: Push to GitHub
1. Create a new **public or private** GitHub repo (e.g. `sohaib-x-md-pair`)
2. Upload **only the contents of this `pairing-server/` folder** (not the whole bot)
3. Commit and push

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) → **Sign in with GitHub**
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your pairing-server repo
4. Railway auto-detects Node.js — click **Deploy**
5. Go to **Settings → Networking → Generate Domain**
6. Your pairing site will be live at `https://your-app.up.railway.app` 🎉

---

## 🌐 Other Free Hosts

### Render (render.com)
1. Create account → **New Web Service** → Connect GitHub repo
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. Free tier: 750 hours/month

### Koyeb (koyeb.com)
1. Connect GitHub → Select repo → Deploy
2. Free tier includes Node.js apps

---

## 🖥️ Run Locally
```bash
cd pairing-server
npm install
npm start
# Open http://localhost:3000
```

---

## How It Works

```
User visits site
    ↓
Chooses QR Code or Pairing Code
    ↓
Server creates an isolated temp Baileys session (unique per user)
    ↓
User scans / enters code in WhatsApp
    ↓
Session ID (STARK-MD~...) generated
    ↓
Sent to user's WhatsApp + shown on screen
    ↓
Temp session files cleaned up automatically
```

Each user's session is completely independent — no shared state between users.

## Rate Limiting
- Max 5 pairing attempts per IP per 10 minutes (prevents abuse)

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port (auto-set by Railway/Render) |
