const { cmd } = require('../lib');

cmd({
  pattern: 'status',
  alias: ['save-status', 'get-status', 'dlstatus'],
  react: '📥',
  desc: 'Download status media and send it to your personal chat',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    // We want to download the quoted message
    if (!m.quoted) {
      return reply("❌ *Please reply to a status (image, video, audio, or text)!*");
    }

    const q = m.quoted;
    const personalJid = conn.user.id.split(":")[0] + "@s.whatsapp.net";

    // Check if the quoted message contains media
    const isImage = q.mtype === "imageMessage";
    const isVideo = q.mtype === "videoMessage";
    const isAudio = q.mtype === "audioMessage";
    const isDocument = q.mtype === "documentMessage";
    const isText = q.mtype === "conversation" || q.mtype === "extendedTextMessage";

    if (!isImage && !isVideo && !isAudio && !isDocument && !isText) {
      return reply("❌ *Unsupported status type!*");
    }

    await reply("📥 *Saving status to your personal chat...*");

    if (isText) {
      // Send text status
      await conn.sendMessage(personalJid, {
        text: `💬 *Status Text from @${q.sender.split("@")[0]}:*\n\n${q.text}`,
        mentions: [q.sender]
      });
    } else {
      // Download media
      const buffer = await q.download();
      if (!buffer) {
        throw new Error("Could not download media");
      }

      const caption = q.text ? `📝 *Status Caption from @${q.sender.split("@")[0]}:*\n\n${q.text}` : `📥 *Status saved from @${q.sender.split("@")[0]}*`;

      if (isImage) {
        await conn.sendMessage(personalJid, { image: buffer, caption, mentions: [q.sender] });
      } else if (isVideo) {
        await conn.sendMessage(personalJid, { video: buffer, caption, mentions: [q.sender] });
      } else if (isAudio) {
        await conn.sendMessage(personalJid, { audio: buffer, mimetype: q.msg?.mimetype || 'audio/mp4', mentions: [q.sender] });
      } else if (isDocument) {
        await conn.sendMessage(personalJid, {
          document: buffer,
          mimetype: q.msg?.mimetype,
          fileName: q.msg?.fileName || 'status_file',
          caption,
          mentions: [q.sender]
        });
      }
    }

    // Try to delete the status command reply in the source chat to keep it clean (if it was sent to someone else's chat)
    try {
      if (m.chat !== personalJid) {
        await conn.sendMessage(m.chat, { delete: mek.key }).catch(() => {});
      }
    } catch (e) {}

  } catch (err) {
    console.error("Save Status Error:", err);
    reply("❌ *Failed to save status:* " + err.message);
  }
});
