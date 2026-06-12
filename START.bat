@echo off
title ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ — Pairing Server
color 0A
echo.
echo  ==========================================
echo   ᝰ.ᐟsᴏʜᴀɪʙ-x-ᴍᴅ Pairing Server Launcher
echo  ==========================================
echo.
echo  [1] Starting pairing server on port 3000...
start "Pairing Server" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 3 /nobreak >nul

echo  [2] Starting Cloudflare Tunnel...
echo  [*] Your public URL will appear below:
echo  [*] Look for: https://xxxx-xxxx.trycloudflare.com
echo.
cloudflared tunnel --url http://localhost:3000
