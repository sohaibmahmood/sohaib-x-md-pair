const { cmd } = require('../lib');

cmd({
  pattern: 'ghost',
  alias: ['invisible', 'ghostmode'],
  react: '👻',
  desc: 'Toggle Ghost mode (Stay invisible and suppress read receipts)',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, args, isOwner }) => {
  try {
    if (!isOwner) return reply("❌ *This command is only for the bot Owner!*");

    const mode = args[0]?.toLowerCase();

    if (mode === 'on') {
      global.ghostMode = true;

      // Store original readMessages function if not already saved
      if (!conn._originalReadMessages) {
        conn._originalReadMessages = conn.readMessages;
      }

      // Override readMessages to suppress sending read receipts over network
      conn.readMessages = async () => {
        // Suppress network read receipt stanza
        return Promise.resolve();
      };

      await conn.sendPresenceUpdate('unavailable', m.chat).catch(() => {});

      return reply("👻 *Ghost Mode Activated!*\n\n• Read receipts (blue ticks) suppressed\n• Presence updates set to offline");

    } else if (mode === 'off') {
      global.ghostMode = false;

      // Restore original readMessages function
      if (conn._originalReadMessages) {
        conn.readMessages = conn._originalReadMessages;
      }

      await conn.sendPresenceUpdate('available', m.chat).catch(() => {});

      return reply("✅ *Ghost Mode Deactivated!*\n\n• Normal read receipt and presence behavior restored.");

    } else {
      return reply("❌ *Usage:* `.ghost on` or `.ghost off`");
    }
  } catch (err) {
    reply("❌ *Error:* " + err.message);
  }
});
