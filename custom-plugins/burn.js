const { cmd } = require('../lib');

cmd({
  pattern: 'burn',
  alias: ['selfdestruct', 'sd'],
  react: '🔥',
  desc: 'Send a message that self-destructs after a specified duration',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { reply, from, q, isOwner }) => {
  try {
    if (!isOwner) return reply("❌ *This command is only for the bot Owner!*");

    if (!q || !q.includes('|')) {
      return reply("❌ *Invalid format!*\n\n*Usage:* `.burn <time> | <message>`\n*Examples:*\n• `.burn 10s | Secret text`\n• `.burn 1m | Confidential message`\n• `.burn 5m | This will burn soon`\n\n*Supported units:*\n• `s` (seconds)\n• `m` (minutes)\n• `h` (hours)");
    }

    const parts = q.split('|');
    const timeInput = parts[0].trim();
    const message = parts.slice(1).join('|').trim();

    if (!timeInput || !message) {
      return reply("❌ *Time and message cannot be empty!*");
    }

    // Parse time
    const match = timeInput.match(/^(\d+)(s|m|h)$/i);
    if (!match) {
      return reply("❌ *Invalid duration format!*\nUse `s` for seconds, `m` for minutes, or `h` for hours (e.g. `30s`, `2m`, `1h`).");
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let durationMs = 0;

    if (unit === 's') durationMs = value * 1000;
    else if (unit === 'm') durationMs = value * 60 * 1000;
    else if (unit === 'h') durationMs = value * 60 * 60 * 1000;

    if (durationMs <= 0) {
      return reply("❌ *Duration must be greater than 0!*");
    }

    // Delete the command trigger message to keep chat clean
    try {
      await conn.sendMessage(from, { delete: mek.key }).catch(() => {});
    } catch (e) {}

    // Send the self-destructing message
    const burnMessage = `🔥 *[SELF-DESTRUCT IN ${timeInput.toUpperCase()}]* 🔥\n\n${message}`;
    const sent = await conn.sendMessage(from, { text: burnMessage });

    // Set timeout to delete
    setTimeout(async () => {
      try {
        await conn.sendMessage(from, { delete: sent.key });
      } catch (err) {
        console.error("[Burn] Failed to delete message:", err.message);
      }
    }, durationMs);

  } catch (err) {
    console.error("Burn Message Error:", err);
    reply("❌ *Failed to send burn message:* " + err.message);
  }
});
