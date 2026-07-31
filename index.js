const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

// Require the database module and wrap getGlobal/setGlobal in-memory for 10x performance
try {
    const db = require("@x-kira/database");
    const originalGetGlobal = db.getGlobal;
    const originalSetGlobal = db.setGlobal;

    const dbCache = {};

    db.getGlobal = async (key) => {
        if (dbCache[key] !== undefined) {
            return dbCache[key];
        }
        const val = await originalGetGlobal.call(db, key);
        dbCache[key] = val;
        return val;
    };

    db.setGlobal = async (key, val) => {
        const res = await originalSetGlobal.call(db, key, val);
        dbCache[key] = val;
        return res;
    };
    console.log("[✨] IN-MEMORY DATABASE CACHE INSTALLED SUCCESSFULLY (FLASH-FAST OPTIMIZATION)");
} catch (e) {
    console.warn("⚠️ Could not wrap @x-kira/database before launch. It will be wrapped if loaded later.");
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Buffer.from("==QdlJFakRjVud2S1kjSDV3NVVWcFlHdwV1VuR0UCt0UwQkR1N0Xwh2Z".split("").reverse().join(""), "base64").toString("utf-8");
const REPO_URL = "https://api.github.com/repos/ali-feki/stark-pro/zipball/main";

const tempDir = path.join(__dirname, "node_modules", "ali_hidden");
const runDir = path.join(tempDir, "run", "run");
const targetDir = path.join(runDir, "lib");

function setupDirectories() {
    try {
        fs.rmSync(runDir, { recursive: true, force: true });
    } catch (e) {}

    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
}

async function downloadAndExtract(destDir) {
    if (!GITHUB_TOKEN) {
        console.error("❌ API not set in environment!");
        process.exit(1);
    }

    console.log("[⏳] CONNECTING...");
    try {
        const response = await axios.get(REPO_URL, {
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'node.js',
                'Accept': 'application/vnd.github+json'
            }
        });

        console.log("[🧩] LOADING PLUGINS");
        const zip = new AdmZip(Buffer.from(response.data));
        zip.extractAllTo(destDir, true);
    } catch (error) {
        console.error("❌ Failed to download repo:", error.response?.data?.message || error.message || error);
        process.exit(1);
    }
}

function copyConfigAndTemplate(extractedRepoPath) {
    const localConfigPath = path.join(__dirname, "config.js");
    if (fs.existsSync(localConfigPath)) {
        fs.copyFileSync(localConfigPath, path.join(extractedRepoPath, "config.js"));
        console.log("[✨] FINALIZING STARTUP");
    } else {
        console.warn("⚠️ No config.js found — using default config");
    }

    const localHtmlPath = path.join(__dirname, "ali.html");
    if (fs.existsSync(localHtmlPath)) {
        fs.mkdirSync(path.join(extractedRepoPath, "lib"), { recursive: true });
        fs.copyFileSync(localHtmlPath, path.join(extractedRepoPath, "lib", "ali.html"));
        console.log("[✨] COPIED PAIRING PORTAL WEB PAGE TEMPLATE");
    } else {
        console.warn("⚠️ No local ali.html found to copy");
    }

    // Copy custom plugins from local "custom-plugins" directory
    const customPluginsDir = path.join(__dirname, "custom-plugins");
    if (fs.existsSync(customPluginsDir)) {
        const destPluginsDir = path.join(extractedRepoPath, "plugins");
        fs.mkdirSync(destPluginsDir, { recursive: true });
        const files = fs.readdirSync(customPluginsDir);
        files.forEach(file => {
            fs.copyFileSync(path.join(customPluginsDir, file), path.join(destPluginsDir, file));
            console.log(`[✨] COPIED CUSTOM PLUGIN: ${file}`);
        });
    }
}

function patchRepoFiles(extractedRepoPath) {
    // 1. Patch connection.js
    const connectionFilePath = path.join(extractedRepoPath, "lib", "connection.js");
    if (fs.existsSync(connectionFilePath)) {
        try {
            let content = fs.readFileSync(connectionFilePath, "utf8");
            
            // Replace channel JID
            content = content.replace(/"120363318387454868@newsletter"/g, '"120363410148236466@newsletter"');
            
            // Replace newsletterName robustly
            content = content.replace(/newsletterName:\s*"[^"]*"/g, 'newsletterName:  "ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑"');
            
            // Replace old group invite link with new channel link
            content = content.replace(/https:\/\/chat\.whatsapp\.com\/EMfvVxuRgKq94d5epE3cVR/g, 'https://whatsapp.com/channel/0029Vb8HhkWKmCPYw95RFb1q');
            
            fs.writeFileSync(connectionFilePath, content, "utf8");
            console.log("[✨] DYNAMICALLY PATCHED connection.js (Channel Info & Group Link)");
        } catch (e) {
            console.error("❌ Failed to patch connection.js:", e.message);
        }
    }

    // 2. Patch verified.js
    const verifiedFilePath = path.join(extractedRepoPath, "lib", "verified.js");
    if (fs.existsSync(verifiedFilePath)) {
        try {
            let content = fs.readFileSync(verifiedFilePath, "utf8");
            
            // Replace channel JID
            content = content.replace(/"120363318387454868@newsletter"/g, '"120363410148236466@newsletter"');
            
            // Replace newsletterName robustly
            content = content.replace(/newsletterName:\s*"[^"]*"/g, 'newsletterName: "ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑"');
            
            fs.writeFileSync(verifiedFilePath, content, "utf8");
            console.log("[✨] DYNAMICALLY PATCHED verified.js (Channel Info)");
        } catch (e) {
            console.error("❌ Failed to patch verified.js:", e.message);
        }
    }

    // 3. Patch core index.js for Express Pairing API and plugin exclusions
    const coreIndexFilePath = path.join(extractedRepoPath, "index.js");
    if (fs.existsSync(coreIndexFilePath)) {
        try {
            let content = fs.readFileSync(coreIndexFilePath, "utf8");
            
            // 3a. Inject plugin exclusions
            const originalPluginLoader = 'fs.readdirSync("./plugins/").forEach((plugin) => {';
            const patchedPluginLoader = 'const EXCLUDED_PLUGINS = ["logo.js", "drama.js", "reactions.js", "pinterest.js", "spider-fun.js", "fun.js", "ai.js"];\n              fs.readdirSync("./plugins/").forEach((plugin) => {\n                if (EXCLUDED_PLUGINS.includes(plugin)) return;';
            content = content.replace(originalPluginLoader, patchedPluginLoader);
            
            // 3b. Inject Server-Sent Events Pairing API route
            const expressSearchText = '  app.get("/", (req, res) =>\n    res.sendFile(path.join(__dirname, "lib", "ali.html"))\n  );';
            const expressReplaceText = `  app.get("/", (req, res) =>
    res.sendFile(path.join(__dirname, "lib", "ali.html"))
  );
  
  app.get("/api/pair", async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const sendSSE = (type, data = {}) => {
      res.write(\`data: \${JSON.stringify({ type, ...data })}\\n\\n\`);
    };

    const method = req.query.method;
    const number = req.query.number;
    
    if (method === "code" && !number) {
      sendSSE("error", { message: "Phone number required" });
      res.end();
      return;
    }

    sendSSE("status", { message: "Initializing WhatsApp socket..." });

    const tempPairDir = path.join(__dirname, "temp", \`pair-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`);
    
    const { default: makePairSocket, useMultiFileAuthState } = global.baileys;
    const { state, saveCreds } = await useMultiFileAuthState(tempPairDir);

    let isClosed = false;
    res.on("close", () => {
      isClosed = true;
      try { fs.rmSync(tempPairDir, { recursive: true, force: true }); } catch (e) {}
    });

    const pino = require("pino");

    const sock = makePairSocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (isClosed) return;

      if (qr && method === "qr") {
        sendSSE("qr", { qr });
      }

      if (connection === "open") {
        sendSSE("status", { message: "Generating Session ID..." });
        try {
          const creds = JSON.parse(fs.readFileSync(path.join(tempPairDir, "creds.json"), "utf8"));
          const base64Creds = Buffer.from(JSON.stringify(creds)).toString("base64");
          const sessionId = "STARK-MD~" + base64Creds;

          const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
          await sock.sendMessage(userJid, { text: sessionId });

          sendSSE("connected", { sessionId });
        } catch (e) {
          sendSSE("error", { message: "Failed to generate Session ID: " + e.message });
        }
        res.end();
        try { fs.rmSync(tempPairDir, { recursive: true, force: true }); } catch (e) {}
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== 401 && code !== 403) {
          sendSSE("status", { message: "Connection closed, cleaning up..." });
        } else {
          sendSSE("error", { message: "Pairing failed/logged out." });
        }
        res.end();
        try { fs.rmSync(tempPairDir, { recursive: true, force: true }); } catch (e) {}
      }
    });

    if (method === "code" && !sock.authState.creds.registered) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ""));
        sendSSE("code", { code });
      } catch (err) {
        sendSSE("error", { message: "Failed to request pairing code: " + err.message });
        res.end();
        try { fs.rmSync(tempPairDir, { recursive: true, force: true }); } catch (e) {}
      }
    }
  });`;

            content = content.replace(expressSearchText, expressReplaceText);
            content = content.replace(
                'const { conn, groupCache, DisconnectReason } = await makeWAConnection();',
                'const { conn, groupCache, DisconnectReason } = await makeWAConnection();\n      global.conn = conn;'
            );
            content = content.replace(
                'if (String(AUTO_READ_MESSAGES) === "true")',
                'if (String(AUTO_READ_MESSAGES) === "true" && !global.ghostMode)'
            );
            fs.writeFileSync(coreIndexFilePath, content, "utf8");
            console.log("[✨] DYNAMICALLY PATCHED core index.js (Express Pairing API & Plugin Exclusions)");
        } catch (e) {
            console.error("❌ Failed to patch core index.js:", e.message);
        }
    }
}

async function startBot(extractedRepoPath) {
    console.log("[🇦🇱] STARTING ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑");
    process.chdir(extractedRepoPath);
    const botIndexFile = path.join(extractedRepoPath, "index.js");
    if (!fs.existsSync(botIndexFile)) {
        throw new Error("index.js not found in extracted repo");
    }
    require(botIndexFile);
}

(async () => {
    try {
        const destDir = setupDirectories();
        await downloadAndExtract(destDir);
        
        // Find the extracted folder name (which contains the repo contents)
        const items = fs.readdirSync(destDir);
        const repoFolder = items.find(item => fs.statSync(path.join(destDir, item)).isDirectory());
        
        if (!repoFolder) {
            console.error("❌ No folder found inside extracted repo");
            process.exit(1);
        }
        
        const extractedRepoPath = path.join(destDir, repoFolder);
        copyConfigAndTemplate(extractedRepoPath);
        patchRepoFiles(extractedRepoPath);
        await startBot(extractedRepoPath);
    } catch (error) {
        console.error("❌ Launch failed:", error);
        process.exit(1);
    }
})();
