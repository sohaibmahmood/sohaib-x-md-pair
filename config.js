const fs = require('fs'),
    dotenv = fs.existsSync('config.env') ? require('dotenv').config({ path: '/.env' }) : undefined,
    convertToBool = (text, fault = 'true') => text === fault;

global.session = "https://sohaib-x-md-pair.up.railway.app";

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "STARK-MD~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiYUVIdkhQc2JPeUZUT3dKRmQ4VnZHdmFkeGoxdEsrVUFicnFWTmpHekNuMD0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiTmJxUkJ1TzRGU1JxT05OUmNDdjFpYWhObmhqYVlIUmlZMjNXVmFqYzZWYz0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJVQVZkYnNTK1pPNi9lQ1ViU0JGODN6L2FTQytIblNHRWNOOFlLRTBqajNBPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJXK2pUKzlycmVHVGlONDc3bFU3UDk0UDk4T3BUaFZPSlBPcEtnY3NiU2g4PSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImtJdVdHcHUxOGxiMFhRNVlYeFh6RFprK25XNnQ5bFNNdE1GTW81SHlvblE9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6InNXRmlwOENCbkI5dTg2SEdWOEZOZkQ1VWVlTUNRL0dCZkptQ3VkKy8za2M9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoib05PSG5CVms2Tkc3aHJQT1hoTmJPVDYrU3VaV2Nmelh2VkJKODdNckRIUT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNzNFakhwTFMwbGE1dlRhV0FnNnNjdkdXeFY1YXVkVXNobEhrNzI1SHVVVT0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IlJRMGt6TCtOMzZxVlZ1dU1UcCtZekhNRHdYRUp0NEJrNUFSSU5GK2J0Q1ZhYWJOUFE5V1AvWlpWTFd4YmtNMFJoYy9wVVNucTl5OHI4TENFRnlqMGhBPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTM0LCJhZHZTZWNyZXRLZXkiOiJtMzdXclEzUXVRQ1FQZU1OWFF1bERjOHhUbUNiQlB2cm1FZDJLVXc3cEpNPSIsInByb2Nlc3NlZEhpc3RvcnlNZXNzYWdlcyI6W10sIm5leHRQcmVLZXlJZCI6MzEsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjozMSwiYWNvdW50U3luY0NvdW50ZXIiOjAsImFjY291bnRTZXR0aW5ncyI6eyJ1bmFyY2hpdmVDaGF0cyI6ZmFsc2V9LCJyZWdpc3RyZXJlZCI6dHJ1ZSwicGFpcmluZ0NvZGUiOiI5R01IV0E2QiIsIm1lIjp7ImlkIjoiOTIzMTQ4NzQwOTk0OjkxQHMud2hhdHNhcHAubmV0In0sImFjY291bnQiOnsiZGV0YWlscyI6IkNLMjR1djhIRUwvSXN0RUdHQm9nQUNnQSIsImFjY291bnRTaWduYXR1cmVLZXkiOiIvWHRMeGRlLzV3NjdESzV1ZXYzeTVqTXAydUNHaWVacHdDYW9rTFZZcWhnPSIsImFjY291bnRTaWduYXR1cmUiOiJUUTRDTnVZbW8vbTJFcmxKRm5BTkk3RDdvdUN2Rko0NENBaTdQZE5GQ0J6THhrUGRxaVliYjNsRHpXNS9YREUzejR4d3E1dXlSTFB5TFlNWWdSb2FBUT09IiwiZGV2aWNlU2lnbmF0dXJlIjoiVUF1SVM4b0c4RzQzbVhua3k2Wmw5a25FYk1LaXZzdGxjZ1F5ekRIVWtpckovaWVRRXY4a3JKL0JFZjhJY3Y3cXcyUXJYVUpDcmlLR3dsSEU3UnhwakE9PSJ9LCJzaWduYWxJZGVudGlmaWVyIjpbeyJpZGVudGlmaWVyIjp7Im5hbWUiOiI5MjMxNDg3NDA5OTQ6OTFAcy53aGF0c2FwcC5uZXQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCZjE3UzhYWHYrY091d3l1Ym5yOTh1WXpLZHJnaG9ubWFjQW1xSkMxV0tvWSJ9fV0sInBsYXRmb3JtIjoiYW5kcm9pZCIsInJvdXRpbmdJbmZvIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ0FJSUNBZ1MifSwibGFzdEFjY291bnRTeW5jVGltZXN0YW1wIjoxNzgxMzEwNTM0fQ==",
    SUDO_NUMBERS: process.env.SUDO_NUMBERS || "923148740994", // Add multiple numbers with country codes without (+), separated by comma
    ANTI_DELETE: process.env.ANTI_DELETE || "true", // ✅ only ONE, default = true
    AUTO_STATUS_VIEWS: process.env.AUTO_STATUS_VIEWS || "true",
    AUTO_STATUS_REACTS: process.env.AUTO_STATUS_REACTS || "true",
    AUTO_STATUS_EMOJIS: process.env.AUTO_STATUS_EMOJIS || "❤️,💀,🌚,🌟,🔥,❤️‍🩹,🌸,🍁,🍂,🦋,🍥,🍧,🍨,🍫,🍭,🎀,🎐,🎗️,👑,🚩,🇵🇰,🍓,🍇,🧃,🗿,🎋,💸,🧸,🦢,✨,🌾,🌊,⚡,🌏,🕸️,🎀,🪄,🌝,🌜,💫,🤍,🖤,🤎,💜,💙", // Input your custom emojis
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    STATUS_REPLY_MSG: process.env.STATUS_REPLY_MSG || "✅️ STATUS VIEWED BY ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑", // Custom message
    MODE: process.env.MODE || "public", // Options: private, public, inbox, groups
    TGTOKEN: process.env.TGTOKEN || "7672295852:AAG0SEMHbM1jhkpodxHspJuVT5tiAhXPPpI",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "923148740994", // Only 1 owner number here, others add to sudo numbers
    OWNER_NAME: process.env.OWNER_NAME || "Sohaib Mahmood ( Zabi )", // Custom name
    PACK_AUTHOR: process.env.PACK_AUTHOR || "", // Custom
    PACK_NAME: process.env.PACK_NAME || "",
    PREFIX: process.env.PREFIX || ".",
    VERSION: process.env.VERSION || "9.0.0",
    ANTI_LINK: process.env.ANTI_LINK || "false", // true = kick, delete = delete, warn = warn
    ANTI_CALL: process.env.ANTI_CALL || "false",
    ANTIBAD: process.env.ANTIBAD || "false",
    BAD_WORDS: process.env.BAD_WORDS || "fuck, pussy, anus, idiot", // Will be deleted if ANTIBAD is true
    ANTI_CALL_MSG: process.env.ANTI_CALL_MSG || "*📞 ᴄαℓℓ ɴσт αℓℓσωє∂ ιɴ тнιѕ ɴᴜмвєʀ уσυ ∂σɴт нανє ᴘєʀмιѕѕισɴ 📵*",
    AUTO_REACT: process.env.AUTO_REACT || "false",
    OWNER_REACT: process.env.OWNER_REACT || "false",
    BOT_NAME: process.env.BOT_NAME || "ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑", // Don't change
    BOT_PIC: process.env.BOT_PIC || "https://files.catbox.moe/of5b5q.png", // Don't change
    AUTO_AUDIO: process.env.AUTO_AUDIO || "false",
    AUTO_BIO: process.env.AUTO_BIO || "false",
    AUTO_BIO_QUOTE: process.env.AUTO_BIO_QUOTE || "ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ ꨄ </👑 ALIVE",
    WELCOME: process.env.WELCOME || "false",
    AUTO_READ_MESSAGES: process.env.AUTO_READ_MESSAGES || "false", // true = bluetick all messages, commands = bluetick commands only
    AUTO_BLOCK: process.env.AUTO_BLOCK || "333,799", // Multiple country codes separated by comma
    PRESENCE: process.env.PRESENCE || "null", // typing, recording, online, null
    TIME_ZONE: process.env.TIME_ZONE || "Asia/Karachi", // Enter your timezone
};

// Auto-reload this config when file changes
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update '${__filename}'`);
    delete require.cache[file];
    require(file);
});
