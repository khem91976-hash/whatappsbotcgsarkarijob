const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
        ] 
    }
});

const RSS_URL = 'https://cgsarkari.com/feed/'; 
const GROUP_NAME = 'cg sarkari job and yojna'; 
const GROUP_INVITE = 'https://chat.whatsapp.com/DCCSBPujcR5FGan84uAIXt';
let lastPostLink = ""; 

client.on('ready', () => {
    console.log('✅ बॉट चालू है और cgsarkari.com की निगरानी कर रहा है...');
    checkFeed();
});

async function checkFeed() {
    try {
        console.log("🔍 नई पोस्ट की जाँच हो रही है...");
        let feed = await parser.parseURL(RSS_URL);
        let latestPost = feed.items[0];

        if (latestPost) {
            const postDate = new Date(latestPost.pubDate).toDateString();
            const today = new Date().toDateString();

            // Logic: लिंक नई होनी चाहिए और तारीख आज की होनी चाहिए
            if (latestPost.link !== lastPostLink && postDate === today) {
                lastPostLink = latestPost.link; 

                const chats = await client.getChats();
                const myGroup = chats.find(chat => chat.name === GROUP_NAME);

                if (myGroup) {
                    const message = `🚀 *नई सरकारी नौकरी अपडेट (${postDate})*\n\n*${latestPost.title}*\n\n🔗 यहाँ से देखें: ${latestPost.link}\n\n📢 हमारे ग्रुप से जुड़ें:\n${GROUP_INVITE}\n\n_CGSarkari.com_`;
                    await myGroup.sendMessage(message);
                    console.log('📩 आज की पोस्ट ग्रुप में भेज दी गई!');
                } else {
                    console.log('⚠️ ग्रुप नहीं मिला! नाम चेक करें: ' + GROUP_NAME);
                }
            } else {
                console.log("😴 कोई नई आज की पोस्ट नहीं मिली।");
            }
        }
    } catch (error) {
        console.log('❌ एरर:', error.message);
    }
}

// हर 6 घंटे में चेक करेगा
setInterval(checkFeed, 21600000); 

client.initialize().catch(err => console.error('❌ Init Error:', err));
