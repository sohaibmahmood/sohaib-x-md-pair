const { cmd } = require('../lib');

cmd({
  pattern: 'ghost',
  alias: ['invisible', 'ghostmode'],
  react: '👻',
  desc: 'Toggle Ghost mode (Suppress read receipts, auto-read & presence)',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, args, isOwner }) => {
  try {
    if (!isOwner) return reply("❌ *This command is only for the bot Owner!*");

    const mode = args[0]?.toLowerCase();

    if (typeof global.ghostMode === 'undefined') {
      global.ghostMode = false;
    }

    if (mode === 'on') {
      global.ghostMode = true;

      if (!conn._originalReadMessages) {
        conn._originalReadMessages = conn.readMessages;
      }
      if (!conn._originalSendReceipt && conn.sendReceipt) {
        conn._originalSendReceipt = conn.sendReceipt;
      }

      if (conn.opts) {
        conn.opts.autoRead = false;
      }

      conn.readMessages = async () => Promise.resolve();
      if (conn.sendReceipt) {
        conn.sendReceipt = async () => Promise.resolve();
      }

      await conn.sendPresenceUpdate('unavailable', m.chat).catch(() => {});

      return reply("👻 *Ghost Mode Activated!*\n\n• Read receipts (Blue Ticks) suppressed\n• Socket Auto-Read disabled\n• Presence set to Offline");

    } else if (mode === 'off') {
      global.ghostMode = false;

      if (conn.opts) {
        conn.opts.autoRead = true;
      }

      if (conn._originalReadMessages) {
        conn.readMessages = conn._originalReadMessages;
      }
      if (conn._originalSendReceipt && conn.sendReceipt) {
        conn.sendReceipt = conn._originalSendReceipt;
      }

      await conn.sendPresenceUpdate('available', m.chat).catch(() => {});

      return reply("✅ *Ghost Mode Deactivated!*\n\n• Normal read receipt, auto-read, and presence behavior restored.");

    } else {
      return reply("❌ *Usage:* `.ghost on` or `.ghost off`");
    }
  } catch (err) {
    reply("❌ *Error:* " + err.message);
  }
});
