const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

// ✅ GitHub Actions detection
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
            '--disable-features=IsolateOrigins,site-per-process',
            '--single-process'  // GitHub Actions के लिए जरूरी
        ],
        dumpio: false
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true
});

const RSS_URL = 'https://cgsarkari.com/feed/';
const GROUP_NAME = 'cg sarkari job and yojna';
const GROUP_INVITE = 'https://chat.whatsapp.com/DCCSBPujcR5FGan84uAIXt';
let lastPostLink = "";

// ✅ QR Code handler - GitHub Actions में अलग तरीके से
client.on('qr', (qr) => {
    if (isGitHubActions) {
        // GitHub Actions में QR code को output में दिखाएं
        console.log('::warning::QR Code generated! Scan from logs below:');
        console.log(qr);  // Raw QR string
    } else {
        qrcode.generate(qr, { small: true });
    }
    console.log('📱 QR Code generated! Scan karein...');
});

client.on('ready', () => {
    console.log('✅ Bot ready!');
    checkFeed();
    
    // ✅ GitHub Actions में 2 मिनट बाद auto-exit
    if (isGitHubActions) {
        setTimeout(() => {
            console.log('🛑 GitHub Actions: Auto shutdown');
            client.destroy();
            process.exit(0);
        }, 120000);  // 2 minutes
    }
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
    if (isGitHubActions) process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('❌ Disconnected:', reason);
    process.exit(0);
});

async function checkFeed() {
    try {
        console.log("🔍 Checking RSS feed...");
        const feed = await parser.parseURL(RSS_URL);
        
        if (!feed.items?.length) {
            console.log("⚠️ No items in feed");
            return;
        }

        const latestPost = feed.items[0];
        const postDate = new Date(latestPost.pubDate).toDateString();
        const today = new Date().toDateString();

        console.log(`📰 Latest: ${latestPost.title} | Date: ${postDate}`);

        if (latestPost.link !== lastPostLink && postDate === today) {
            lastPostLink = latestPost.link;
            
            const chats = await client.getChats();
            const myGroup = chats.find(chat => 
                chat.name?.toLowerCase().includes(GROUP_NAME.toLowerCase())
            );

            if (myGroup) {
                const message = `🚀 *नई सरकारी नौकरी अपडेट*\n\n*${latestPost.title}*\n\n🔗 देखें: ${latestPost.link}\n\n📢 जुड़ें: ${GROUP_INVITE}\n\n_CGSarkari.com_`;
                
                await myGroup.sendMessage(message);
                console.log('✅ Message sent!');
                
                // ✅ Success log for GitHub Actions
                if (isGitHubActions) {
                    console.log(`::notice::Message sent: ${latestPost.title}`);
                }
            } else {
                console.log('❌ Group not found!');
                console.log('Available groups:', chats.filter(c => c.isGroup).map(c => c.name));
            }
        } else {
            console.log("😴 No new post today");
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// 6 hours interval (local run के लिए)
if (!isGitHubActions) {
    setInterval(checkFeed, 21600000);
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});

// Start
console.log('🚀 Starting...');
client.initialize().catch(err => {
    console.error('❌ Init error:', err.message);
    process.exit(1);
});
