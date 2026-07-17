const { cmd } = require('../lib');

cmd({
  pattern: 'viewonce',
  alias: ['vo', 'anti-vo', 'readvo'],
  react: '🔓',
  desc: 'Retrieve and bypass View Once messages',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, from }) => {
  try {
    if (!m.quoted) {
      return reply("❌ *Please reply to a View Once image or video!*");
    }

    const q = m.quoted;
    
    // Check if it is a view once message or has viewOnceMessage/viewOnce flags
    const isVO = q.mtype === "viewOnceMessage" || q.msg?.viewOnce === true || q.viewOnce === true;

    // Download media using decorated q.download() function
    const buffer = await q.download();
    if (!buffer) {
      throw new Error("Could not download View Once media.");
    }

    // Determine type
    const mime = q.msg?.mimetype || "";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");

    const caption = q.text ? `🔓 *Bypassed View Once Media:*\n\n${q.text}` : `🔓 *Bypassed View Once Media*`;

    if (isImage || q.mtype === "imageMessage") {
      await conn.sendMessage(from, { image: buffer, caption }, { quoted: mek });
    } else if (isVideo || q.mtype === "videoMessage") {
      await conn.sendMessage(from, { video: buffer, caption }, { quoted: mek });
    } else {
      // Fallback
      await conn.sendMessage(from, {
        document: buffer,
        mimetype: mime || "application/octet-stream",
        fileName: q.msg?.fileName || "view_once_media",
        caption
      }, { quoted: mek });
    }

  } catch (err) {
    console.error("ViewOnce Bypass Error:", err);
    reply("❌ *Failed to bypass View Once:* " + err.message);
  }
});
