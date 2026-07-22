const { cmd } = require('../lib');

cmd({
  pattern: 'ghost',
  alias: ['invisible', 'ghostmode'],
  react: '👻',
  desc: 'Toggle Ghost mode (Stay invisible without sending active presence)',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, args, isOwner }) => {
  try {
    if (!isOwner) return reply("❌ *This command is only for the bot Owner!*");

    const mode = args[0]?.toLowerCase();

    if (mode === 'on') {
      global.ghostMode = true;
      await conn.sendPresenceUpdate('unavailable', m.chat);
      return reply("👻 *Ghost Mode Activated!* (Presence updates set to unavailable/offline)");
    } else if (mode === 'off') {
      global.ghostMode = false;
      await conn.sendPresenceUpdate('available', m.chat);
      return reply("✅ *Ghost Mode Deactivated!*");
    } else {
      return reply("❌ *Usage:* `.ghost on` or `.ghost off`");
    }
  } catch (err) {
    reply("❌ *Error:* " + err.message);
  }
});
