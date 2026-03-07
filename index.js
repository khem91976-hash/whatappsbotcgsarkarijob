const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode'); // npm install qrcode
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.10147.html',
    },
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--single-process'
        ]
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true
});

// ✅ Improved QR Handler
client.on('qr', async (qr) => {
    console.log('📱 QR Code generated!');
    
    if (isGitHubActions) {
        // Terminal QR (ASCII Art)
        qrcode.generate(qr, { small: true });
        
        // File QR (Image) - GitHub Actions artifacts में save होगा
        try {
            await QRCode.toFile('./qr-code.png', qr, {
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                },
                width: 500
            });
            console.log('✅ QR Code saved as qr-code.png');
            console.log('📥 Download this file from Actions artifacts and scan!');
        } catch (err) {
            console.error('❌ QR save error:', err);
        }
    } else {
        qrcode.generate(qr, { small: true });
    }
});

// ... बाकी code same रहेगा ...
