const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

const RSS_URL = 'cgsarkari.com/feed.xml'; // अपना फीड यहाँ डालें
const GROUP_NAME = 'cg sarkari job and yojna'; // अपने ग्रुप का नाम यहाँ डालें

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('QR Code generated! Scan it.');
});

client.on('ready', () => {
    console.log('Client is ready!');
    setInterval(checkFeed, 21600000); // हर 10 मिनट में चेक करेगा
});

async function checkFeed() {
    let feed = await parser.parseURL(RSS_URL);
    let latestPost = feed.items[0];
    // यहाँ हम मैसेज भेजने का लॉजिक लिखेंगे
    const chats = await client.getChats();
    const myGroup = chats.find(chat => chat.name === GROUP_NAME);
    if (myGroup) {
        myGroup.sendMessage(`🚀 नई पोस्ट: ${latestPost.title}\nLink: ${latestPost.link}`);
    }
}

client.initialize();
