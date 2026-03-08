const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const axios = require('axios'); // 👈 API से डेटा लाने के लिए

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const MY_GROUP_ID = '120363422432475431@g.us';
const SENT_POSTS_FILE = './sent_posts.json';

let sentPosts = [];
if (fs.existsSync(SENT_POSTS_FILE)) {
    try {
        sentPosts = JSON.parse(fs.readFileSync(SENT_POSTS_FILE, 'utf-8'));
    } catch (e) { console.error(e); }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
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
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', async qr => { 
    if (isGitHubActions) {
        qrcode.generate(qr, { small: true }); 
        try {
            await QRCode.toFile('./qr-code.png', qr, { width: 500 });
            console.log('✅ QR Code saved as qr-code.png');
        } catch (err) { console.error(err); }
    } 
});

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready! Fetching feed using API Bypass...');

    try {
        // 1. 🚀 यहाँ हमने जादुई RSS2JSON API लगा दी है (यह 403 ब्लॉक को बायपास कर देगी)
        const response = await axios.get('https://api.rss2json.com/v1/api.json?rss_url=https://cgsarkari.com/feed.xml');

        if (response.data.status !== 'ok') {
            throw new Error("Feed fetch failed via API");
        }

        const items = response.data.items;

        if (!items || items.length === 0) {
            console.log('❌ No items found in feed!');
            return;
        }

        // 2. पुरानी पोस्ट छांटें और टॉप 10 नई पोस्ट निकालें
        let newPosts = items.filter(post => !sentPosts.includes(post.link)).slice(0, 10);

        if (newPosts.length === 0) {
            console.log('😴 सब कुछ अप-टू-डेट है। कोई नई पोस्ट नहीं।');
        } else {
            console.log(`📤 ${newPosts.length} नई पोस्ट मिली हैं!`);
            newPosts.reverse(); // सबसे पुरानी पहले भेजें

            for (let post of newPosts) {
                const msg = `🚨 *छत्तीसगढ़ ताज़ा अपडेट* 🚨\n\n📌 *${post.title}*\n\n👇 *पूरी जानकारी यहाँ देखें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group!*`;
                
                // मैसेज ग्रुप में भेजें
                await client.sendMessage(MY_GROUP_ID, msg);
                console.log(`✅ Sent: ${post.title}`);
                
                // याददाश्त में सेव करें
                sentPosts.push(post.link);
                await delay(5000); // 5 सेकंड का गैप
            }

            // याददाश्त 100 से ज़्यादा न हो
            if (sentPosts.length > 100) sentPosts = sentPosts.slice(-100);
            fs.writeFileSync(SENT_POSTS_FILE, JSON.stringify(sentPosts, null, 2));
        }

    } catch (error) {
        console.error('❌ Error occurred but saving session:', error.message);
    } finally {
        console.log('🛑 Task Done. Closing bot and SAVING session...');
        await client.destroy();
        process.exit(0);
    }
});

client.initialize();
