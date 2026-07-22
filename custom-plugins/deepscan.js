const { cmd } = require('../lib');

cmd({
  pattern: 'deepscan',
  alias: ['profilescan', 'userinfo', 'whoisuser'],
  react: '🔍',
  desc: 'Fetch public WhatsApp profile details and status',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, q }) => {
  try {
    let target = m.quoted ? m.quoted.sender : m.mentionUser && m.mentionUser[0] ? m.mentionUser[0] : q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.sender;

    if (!target) {
      return reply("❌ *Please reply to a user, tag a user, or provide a number!*");
    }

    await reply("🔍 *Fetching profile info...*");

    // Fetch profile picture
    let pfpUrl;
    try {
      pfpUrl = await conn.profilePictureUrl(target, 'image');
    } catch (e) {
      pfpUrl = null;
    }

    // Fetch status / bio
    let statusText = "No public status available";
    try {
      const statusObj = await conn.fetchStatus(target);
      if (statusObj && statusObj.status) {
        statusText = statusObj.status;
      }
    } catch (e) {}

    const num = target.split('@')[0];
    const infoMsg = `📱 *WhatsApp User Profile Details*\n\n` +
      `👤 *User:* @${num}\n` +
      `📝 *Bio / Status:* ${statusText}\n` +
      `🖼️ *Profile Picture:* ${pfpUrl ? 'Available' : 'Private / Not Available'}\n` +
      `🔗 *Direct Link:* https://wa.me/${num}`;

    if (pfpUrl) {
      await conn.sendMessage(m.chat, {
        image: { url: pfpUrl },
        caption: infoMsg,
        mentions: [target]
      }, { quoted: mek });
    } else {
      await conn.sendMessage(m.chat, {
        text: infoMsg,
        mentions: [target]
      }, { quoted: mek });
    }

  } catch (err) {
    console.error("DeepScan Error:", err);
    reply("❌ *Failed to fetch profile details:* " + err.message);
  }
});
