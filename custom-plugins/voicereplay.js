const { cmd } = require('../lib');

cmd({
  pattern: 'voicereplay',
  alias: ['ptt', 'vn', 'fakevoice'],
  react: '🎙️',
  desc: 'Convert any audio file to a recorded voice note (PTT)',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, from }) => {
  try {
    if (!m.quoted) {
      return reply("❌ *Please reply to an audio message or audio document!*");
    }

    const q = m.quoted;
    const isAudio = q.mtype === "audioMessage" || (q.mtype === "documentMessage" && q.msg?.mimetype?.startsWith("audio/"));

    if (!isAudio) {
      return reply("❌ *Please reply to a valid audio file!*");
    }

    await reply("🎙️ *Converting to voice note... Please wait.*");

    const buffer = await q.download();
    if (!buffer) {
      throw new Error("Could not download audio message.");
    }

    // Send as native WhatsApp voice note (PTT)
    await conn.sendMessage(from, {
      audio: buffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: mek });

  } catch (err) {
    console.error("Voice Replay Error:", err);
    reply("❌ *Failed to convert to voice note:* " + err.message);
  }
});
