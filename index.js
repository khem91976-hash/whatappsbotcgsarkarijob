const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');

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
        // executablePath हटा दिया गया है ताकि Puppeteer अपना डिफ़ॉल्ट ब्राउज़र इस्तेमाल करे
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process'
        ]
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true
});

client.on('qr', async (qr) => {
    console.log('📱 QR Code generated!');
    
    if (isGitHubActions) {
        // Console में प्रिंट करें
        qrcode.generate(qr, { small: true });
        
        // इमेज फाइल बनाएं
        try {
            await QRCode.toFile('./qr-code.png', qr, {
                color: { dark: '#000000', light: '#ffffff' },
                width: 500
            });
            console.log('✅ QR Code saved as qr-code.png');
            console.log('📥 Please check GitHub Actions Artifacts to download and scan the QR.');
        } catch (err) {
            console.error('❌ QR save error:', err);
        }
    } else {
        qrcode.generate(qr, { small: true });
    }
});

// 👇 यहीं पर बदलाव किया गया है 👇
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');

    try {
        // 1. यहाँ अपना WhatsApp नंबर डालें (कंट्री कोड 91 के साथ, बिना + लगाए)
        const myNumber = '917006361200@c.us'; // <--- यहाँ XXXXXXXXXX की जगह अपना 10 अंकों का नंबर लिखें
        
        console.log('📤 Sending test message...');
        await client.sendMessage(myNumber, '🚀 खेम भाई! GitHub Actions से WhatsApp Bot सफलतापूर्वक चालू हो गया है!');
        console.log('✅ Message Sent Successfully!');

    } catch (error) {
        console.error('❌ Message sending failed:', error);
    } finally {
        // 2. काम खत्म होने के बाद बॉट को बंद करना ताकि GitHub Action 'Success' हो जाए
        console.log('🛑 Closing WhatsApp Client to finish Action...');
        await client.destroy();
        process.exit(0); 
    }
});

client.initialize();
