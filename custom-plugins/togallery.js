const { cmd } = require('../lib');
const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'lib', 'data', 'messages');

// Helper to load a message from cache
function getCachedMessage(id) {
  try {
    const fp = path.join(messagesDir, `${id}.json`);
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    }
  } catch (e) {
    console.error('[ToGallery] Error loading message:', e.message);
  }
  return null;
}

cmd({
  pattern: 'save',
  alias: ['togallery', 'toimg', 'tovid', 'tophoto', 'tovideo', 'getmedia'],
  react: '📥',
  desc: 'Convert document photo/video to native gallery media',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { from, quoted, reply }) => {
  try {
    if (!quoted) {
      return reply("❌ *Please reply to a document photo or video!*");
    }

    const mtype = quoted.mtype || quoted.type || "";
    const isDoc = mtype === "documentMessage";
    
    if (!isDoc) {
      return reply("❌ *Please reply to a document file (image or video)!*");
    }

    const mime = quoted.msg?.mimetype || "";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    const isAudio = mime.startsWith("audio/");

    if (!isImage && !isVideo && !isAudio) {
      return reply("❌ *This document is not an image, video, or audio file!*");
    }

    // Try to find bulk documents sent together (within 12 seconds of this one)
    let targets = [];
    const quotedCached = getCachedMessage(quoted.id);

    if (quotedCached && quotedCached.messageTimestamp) {
      const qTime = quotedCached.messageTimestamp;
      try {
        if (fs.existsSync(messagesDir)) {
          const files = fs.readdirSync(messagesDir);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
              const msgData = JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8'));
              if (msgData?.key?.remoteJid === from) {
                // Same chat
                const tDiff = Math.abs(msgData.messageTimestamp - qTime);
                if (tDiff <= 12) { // 12 seconds window
                  const innerMsg = msgData.message?.documentMessage;
                  if (innerMsg) {
                    const docMime = innerMsg.mimetype || "";
                    if (docMime.startsWith("image/") || docMime.startsWith("video/") || docMime.startsWith("audio/")) {
                      targets.push({
                        id: msgData.key.id,
                        key: msgData.key,
                        msg: innerMsg,
                        type: "documentMessage",
                        timestamp: msgData.messageTimestamp
                      });
                    }
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('[ToGallery] Error listing files:', e.message);
      }
    }

    // Sort by timestamp
    targets.sort((a, b) => a.timestamp - b.timestamp);

    // If no other targets found, default to just the quoted one
    if (targets.length === 0) {
      targets = [{
        id: quoted.id,
        key: quoted.fakeObj?.key || quoted,
        msg: quoted.msg,
        type: "documentMessage"
      }];
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    reply(`📥 *Processing ${targets.length} document(s)... Please wait.*`);

    for (const target of targets) {
      try {
        const buffer = await conn.downloadMediaMessage({
          msg: target.msg,
          mtype: "documentMessage"
        });

        if (!buffer) throw new Error("Could not download buffer");

        const docMime = target.msg.mimetype || "";
        if (docMime.startsWith("image/")) {
          await conn.sendMessage(from, { 
            image: buffer, 
            caption: target.msg.caption || "" 
          }, { quoted: mek });
        } else if (docMime.startsWith("video/")) {
          await conn.sendMessage(from, { 
            video: buffer, 
            caption: target.msg.caption || "" 
          }, { quoted: mek });
        } else if (docMime.startsWith("audio/")) {
          await conn.sendMessage(from, { 
            audio: buffer, 
            mimetype: docMime,
            ptt: false
          }, { quoted: mek });
        }
      } catch (err) {
        console.error(`[ToGallery] Failed to download/send document ${target.id}:`, err.message);
      }
      
      // Brief sleep between messages to prevent rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("Save Document to Gallery Error:", err);
    reply("❌ *Error:* " + err.message);
  }
});
