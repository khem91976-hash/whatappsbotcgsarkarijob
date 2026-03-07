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
    }
});

client.on('qr', async (qr) => {
    console.log('📱 QR Code generated!');
    if (isGitHubActions) {
        qrcode.generate(qr, { small: true });
    }
});

// 👇 बॉट चालू होने के बाद रुकेगा 👇
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');
    console.log('⏳ अब जल्दी से अपने CGSarkari ग्रुप में जाकर !id टाइप करें। बॉट 3 मिनट तक इंतज़ार कर रहा है...');
    
    // 3 मिनट (180000 ms) बाद बॉट अपने आप बंद हो जाएगा (ताकि गिटहब एक्शन न अटके)
    setTimeout(() => {
        console.log('🛑 Time is up! Closing bot...');
        client.destroy();
        process.exit(0);
    }, 180000); 
});

// 👇 ग्रुप की ID निकालने का कोड 👇
client.on('message_create', async (message) => {
    if (message.body === '!id') {
        const chat = await message.getChat();
        if (chat.isGroup) {
            console.log('Group Name:', chat.name);
            console.log('Group ID:', chat.id._serialized);
            await message.reply(`✅ खेम भाई, आपके इस ग्रुप "${chat.name}" की गुप्त ID है:\n\n*${chat.id._serialized}*`);
        } else {
            await message.reply(`✅ आपकी पर्सनल ID है: ${chat.id._serialized}`);
        }
        
        // ID बताने के बाद बॉट शांति से बंद हो जाएगा
        setTimeout(() => {
            console.log('🛑 ID successfully sent! Closing bot...');
            client.destroy();
            process.exit(0);
        }, 3000);
    }
});

client.initialize();
