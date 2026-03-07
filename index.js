const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

const RSS_URL = 'https://cgsarkari.com/feed/'; // URL सही कर दिया
const GROUP_NAME = 'cg sarkari job and yojna'; 
let lastPostLink = ""; // पिछली पोस्ट याद रखने के लिए

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('QR Code आ गया है! (लेकिन GitHub पर इसे स्कैन नहीं कर सकते, auth.zip लोड होना चाहिए)');
});

client.on('ready', () => {
    console.log('Client is ready! CGSarkari Bot चालू हो गया है।');
    checkFeed(); // चालू होते ही तुरंत चेक करें
});

async function checkFeed() {
    try {
        console.log("फीड चेक हो रही है...");
        let feed = await parser.parseURL(RSS_URL);
        let latestPost = feed.items[0];

        // अगर पोस्ट नई है, तभी भेजें
        if (latestPost && latestPost.link !== lastPostLink) {
            lastPostLink = latestPost.link; 

            const chats = await client.getChats();
            const myGroup = chats.find(chat => chat.name === GROUP_NAME);

            if (myGroup) {
                const message = `🚀 *नई सरकारी नौकरी अपडेट!*\n\n*${latestPost.title}*\n\n🔗 यहाँ से देखें: ${latestPost.link}\n\n_CGSarkari.com_`;
                await myGroup.sendMessage(message);
                console.log('ग्रुप में मैसेज भेज दिया गया!');
            } else {
                console.log('ग्रुप नहीं मिला! नाम चेक करें: ' + GROUP_NAME);
            }
        } else {
            console.log("कोई नई पोस्ट नहीं मिली।");
        }
    } catch (error) {
        console.log('फीड पढ़ने में एरर:', error.message);
    }
}

// हर 6 घंटे में चेक करें
setInterval(checkFeed, 21600000);

client.initialize();
