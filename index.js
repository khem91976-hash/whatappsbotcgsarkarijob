const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

// ✅ सही Client Configuration - सब कुछ एक साथ
const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // GitHub सर्वर की मेमोरी क्रैश रोकने के लिए
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // इसे सिंगल प्रोसेस में चलाने के लिए
            '--disable-gpu'
        ] 
    }
});

const RSS_URL = 'https://cgsarkari.com/feed/'; 
const GROUP_NAME = 'cg sarkari job and yojna'; 
const GROUP_INVITE = 'https://chat.whatsapp.com/DCCSBPujcR5FGan84uAIXt';
let lastPostLink = ""; 

// QR Code दिखाने के लिए
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 QR Code स्कैन करें!');
});

client.on('ready', () => {
    console.log('✅ CGSarkari Bot एकदम तैयार है!');
    checkFeed();
});

client.on('auth_failure', msg => { 
    console.error('❌ Auth Error:', msg); 
});

client.on('disconnected', (reason) => {
    console.log('❌ Client Disconnected:', reason);
});

async function checkFeed() {
    try {
        console.log("🔍 आज की पोस्ट चेक कर रहा हूँ...");
        let feed = await parser.parseURL(RSS_URL);
        let latestPost = feed.items[0];

        if (latestPost) {
            const postDate = new Date(latestPost.pubDate).toDateString();
            const today = new Date().toDateString();

            if (latestPost.link !== lastPostLink && postDate === today) {
                lastPostLink = latestPost.link; 

                const chats = await client.getChats();
                const myGroup = chats.find(chat => chat.name === GROUP_NAME);

                if (myGroup) {
                    const message = `🚀 *नई सरकारी नौकरी अपडेट*\n\n*${latestPost.title}*\n\n🔗 यहाँ से देखें: ${latestPost.link}\n\n📢 हमारे ग्रुप से जुड़ें:\n${GROUP_INVITE}\n\n_CGSarkari.com_`;
                    await myGroup.sendMessage(message);
                    console.log('📩 आज की नई पोस्ट भेज दी गई!');
                } else {
                    console.log('⚠️ ग्रुप नहीं मिला!');
                }
            } else {
                console.log("😴 अभी तक आज की कोई नई पोस्ट नहीं आई है।");
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// 6 घंटे का अंतराल
setInterval(checkFeed, 21600000); 

// बॉट चालू करना
client.initialize().catch(err => {
    console.error('❌ Initialization Error:', err);
});
