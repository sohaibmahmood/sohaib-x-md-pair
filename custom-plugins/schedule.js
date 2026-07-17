const { cmd } = require('../lib');
const fs = require('fs');
const path = require('path');

const schedulesFile = path.join(__dirname, 'schedules.json');

function getSchedules() {
  try {
    if (fs.existsSync(schedulesFile)) {
      return JSON.parse(fs.readFileSync(schedulesFile, 'utf8'));
    }
  } catch (e) {
    console.error('[Scheduler] Error reading schedules:', e.message);
  }
  return [];
}

function saveSchedules(schedules) {
  try {
    fs.writeFileSync(schedulesFile, JSON.stringify(schedules, null, 2), 'utf8');
  } catch (e) {
    console.error('[Scheduler] Error saving schedules:', e.message);
  }
}

function parseTime(timeStr) {
  // Relative format: 5m, 2h, 1d
  const relativeMatch = timeStr.trim().match(/^(\d+)(m|h|d)$/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    let ms = 0;
    if (unit === 'm') ms = value * 60 * 1000;
    else if (unit === 'h') ms = value * 60 * 60 * 1000;
    else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
    return { delay: ms, targetTime: Date.now() + ms };
  }

  // Absolute time format: 12:00 AM, 5:30 PM, etc.
  const absoluteMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (absoluteMatch) {
    const hours = parseInt(absoluteMatch[1]);
    const minutes = parseInt(absoluteMatch[2]);
    const ampm = absoluteMatch[3].toLowerCase();

    let targetHours = hours;
    if (ampm === 'pm' && hours < 12) targetHours += 12;
    if (ampm === 'am' && hours === 12) targetHours = 0;

    // Use target timezone: Asia/Karachi (UTC+5)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const karachiTime = new Date(utc + (3600000 * 5)); // UTC+5

    const targetDate = new Date(karachiTime);
    targetDate.setHours(targetHours, minutes, 0, 0);

    // If target time is in the past, schedule it for tomorrow
    if (targetDate.getTime() <= karachiTime.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const delayKarachi = targetDate.getTime() - karachiTime.getTime();
    return { delay: delayKarachi, targetTime: Date.now() + delayKarachi };
  }

  return null;
}

// Background runner
setInterval(async () => {
  if (global.conn && global.conn.user) {
    const now = Date.now();
    const schedules = getSchedules();
    let updated = false;

    for (let i = 0; i < schedules.length; i++) {
      const task = schedules[i];
      if (now >= task.targetTime && !task.sent) {
        task.sent = true;
        updated = true;
        try {
          console.log(`[Scheduler] Sending scheduled message to ${task.chat}: "${task.message}"`);
          await global.conn.sendMessage(task.chat, { text: task.message });
        } catch (err) {
          console.error(`[Scheduler] Failed to send to ${task.chat}:`, err.message);
        }
      }
    }

    if (updated) {
      const activeSchedules = schedules.filter(t => !t.sent);
      saveSchedules(activeSchedules);
    }
  }
}, 10000); // Check every 10 seconds

cmd({
  pattern: 'schedule',
  alias: ['sched', 'sch'],
  react: '⏳',
  desc: 'Schedule a message to be sent at a specific time or delay',
  category: 'tools',
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply, isOwner }) => {
  try {
    if (!isOwner) return reply("❌ *This command is only for the bot Owner!*");

    const subCommand = args[0]?.toLowerCase();

    // 1. List schedules
    if (subCommand === 'list') {
      const schedules = getSchedules();
      if (schedules.length === 0) {
        return reply("⏳ *No active scheduled messages.*");
      }
      
      let listMsg = "📅 *Active Scheduled Messages:*\n\n";
      schedules.forEach((task, idx) => {
        const date = new Date(task.targetTime);
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const localTime = new Date(utc + (3600000 * 5));
        const timeStr = localTime.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
        listMsg += `*ID:* \`${task.id}\`\n*To:* \`${task.chat}\`\n*Time:* \`${timeStr} (Karachi Time)\`\n*Message:* "${task.message}"\n\n`;
      });
      return reply(listMsg);
    }

    // 2. Delete schedule
    if (subCommand === 'delete' || subCommand === 'remove') {
      const id = args[1];
      if (!id) return reply("❌ *Please provide the Schedule ID to delete!*");

      let schedules = getSchedules();
      const initialLength = schedules.length;
      schedules = schedules.filter(t => t.id !== id);

      if (schedules.length === initialLength) {
        return reply(`❌ *No schedule found with ID:* \`${id}\``);
      }

      saveSchedules(schedules);
      return reply(`✅ *Successfully deleted schedule ID:* \`${id}\``);
    }

    // 3. Create schedule
    // Expected format: .schedule 10m | My message OR .schedule 12:00 AM | My message
    if (!q || !q.includes('|')) {
      return reply("❌ *Invalid format!*\n\n*Usage:*\n• `.schedule 10m | Message`\n• `.schedule 12:00 AM | Message`\n• `.schedule list`\n• `.schedule delete <ID>`");
    }

    const parts = q.split('|');
    const timeInput = parts[0].trim();
    const message = parts.slice(1).join('|').trim();

    if (!timeInput || !message) {
      return reply("❌ *Time and message cannot be empty!*");
    }

    const parsed = parseTime(timeInput);
    if (!parsed) {
      return reply("❌ *Invalid time format!*\n\n*Supported formats:*\n• Relative: `5m`, `1h`, `1d` (minutes, hours, days)\n• Absolute: `12:00 AM`, `05:30 PM` (12-hour format)");
    }

    const schedules = getSchedules();
    const id = 'SCH_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const newTask = {
      id,
      chat: from,
      message,
      targetTime: parsed.targetTime,
      sent: false
    };

    schedules.push(newTask);
    saveSchedules(schedules);

    const date = new Date(parsed.targetTime);
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (3600000 * 5));
    const timeStr = localTime.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });

    return reply(`✅ *Message scheduled successfully!*\n\n*ID:* \`${id}\`\n*Target Time:* \`${timeStr} (Karachi Time)\`\n*Message:* "${message}"`);

  } catch (err) {
    console.error("Create Schedule Error:", err);
    reply("❌ *Failed to schedule message:* " + err.message);
  }
});
