const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session_data' // Session को save करने का path
    }),
    // ✅ Latest stable WhatsApp Web version
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
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials'
        ],
        // ✅ Memory optimization
        dumpio: false,
        defaultViewport: {
            width: 1280,
            height: 720
        }
    },
    // ✅ Retry mechanism
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0
});

const RSS_URL = 'https://cgsarkari.com/feed/';
const GROUP_NAME = 'cg sarkari job and yojna';
const GROUP_INVITE = 'https://chat.whatsapp.com/DCCSBPujcR5FGan84uAIXt';
let lastPostLink = "";

// QR Code handler
client.on('qr', (qr) => {
    console.log('📱 QR Code generated!');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ CGSarkari Bot ready!');
    checkFeed();
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Disconnected:', reason);
    // Auto-reconnect
    setTimeout(() => {
        console.log('🔄 Reconnecting...');
        client.initialize().catch(console.error);
    }, 5000);
});

// ✅ Error handling
client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

async function checkFeed() {
    try {
        console.log("🔍 Checking for new posts...");
        const feed = await parser.parseURL(RSS_URL);
        
        if (!feed.items || feed.items.length === 0) {
            console.log("⚠️ No items found in feed");
            return;
        }

        const latestPost = feed.items[0];
        const postDate = new Date(latestPost.pubDate).toDateString();
        const today = new Date().toDateString();

        console.log(`📰 Latest post: ${latestPost.title} (${postDate})`);

        if (latestPost.link !== lastPostLink && postDate === today) {
            lastPostLink = latestPost.link;
            
            // ✅ Retry logic for getting chats
            let retries = 3;
            let myGroup = null;
            
            while (retries > 0 && !myGroup) {
                try {
                    const chats = await client.getChats();
                    myGroup = chats.find(chat => 
                        chat.name && chat.name.toLowerCase() === GROUP_NAME.toLowerCase()
                    );
                    
                    if (!myGroup) {
                        console.log(`⚠️ Group not found, retrying... (${retries} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (chatError) {
                    console.error('❌ Error getting chats:', chatError.message);
                }
                retries--;
            }

            if (myGroup) {
                const message = `🚀 *नई सरकारी नौकरी अपडेट*\n\n*${latestPost.title}*\n\n🔗 यहाँ से देखें: ${latestPost.link}\n\n📢 हमारे ग्रुप से जुड़ें:\n${GROUP_INVITE}\n\n_CGSarkari.com_`;
                
                await myGroup.sendMessage(message);
                console.log('✅ Message sent successfully!');
            } else {
                console.log('❌ Could not find group after retries');
            }
        } else {
            console.log("😴 No new post today or already sent");
        }
    } catch (error) {
        console.error('❌ Feed check error:', error.message);
    }
}

// 6 hours interval
setInterval(checkFeed, 21600000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});

// Initialize with error handling
(async () => {
    try {
        console.log('🚀 Starting bot...');
        await client.initialize();
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        console.log('🔄 Retrying in 10 seconds...');
        setTimeout(() => client.initialize(), 10000);
    }
})();
