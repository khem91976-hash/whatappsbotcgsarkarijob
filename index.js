const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
    authStrategy: new LocalAuth(),
    // webCache को डिसेबल करने से "Execution context" वाला एरर कम आता है
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ] 
    }
});

const RSS_URL = 'https://cgsarkari.com/feed/'; 
const GROUP_NAME = 'cg sarkari job and yojna'; 
const GROUP_INVITE = 'https://chat.whatsapp.com/DCCSBPujcR5FGan84uAIXt';
let lastPostLink = ""; 

client.on('ready', () => {
    console.log('✅ CGSarkari Bot तैयार है!');
    checkFeed();
});

// लॉगिन फेल होने पर बताएगा
client.on('auth_failure', msg => { console.error('❌ Auth Error:', msg); });

async function checkFeed() {
    try {
        console.log("🔍 पोस्ट चेक कर रहा हूँ...");
        let feed = await parser.parseURL(RSS_URL);
        let latestPost = feed.items[0];

        if (latestPost) {
            const postDate = new Date(latestPost.pubDate).toDateString();
            const today = new Date().toDateString();

            // सिर्फ आज की पोस्ट और नई लिंक
            if (latestPost.link !== lastPostLink && postDate === today) {
                lastPostLink = latestPost.link; 

                const chats = await client.getChats();
                const myGroup = chats.find(chat => chat.name === GROUP_NAME);

                if (myGroup) {
                    const message = `🚀 *नई सरकारी नौकरी अपडेट*\n\n*${latestPost.title}*\n\n🔗 यहाँ से देखें: ${latestPost.link}\n\n📢 हमारे ग्रुप से जुड़ें:\n${GROUP_INVITE}\n\n_CGSarkari.com_`;
                    await myGroup.sendMessage(message);
                    console.log('📩 मैसेज भेज दिया गया!');
                } else {
                    console.log('⚠️ ग्रुप नहीं मिला!');
                }
            } else {
                console.log("😴 कोई नई आज की पोस्ट नहीं है।");
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// हर 6 घंटे में (21600000 ms)
setInterval(checkFeed, 21600000); 

client.initialize().catch(err => console.error('❌ Init Error:', err));
