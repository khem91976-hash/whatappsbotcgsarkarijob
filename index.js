const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const axios = require('axios'); // 👈 XML डाउनलोड करने के लिए

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
        // इमेज फाइल बनाएं ताकि आप डाउनलोड कर सकें
        try {
            await QRCode.toFile('./qr-code.png', qr, { width: 500 });
            console.log('✅ QR Code saved as qr-code.png');
        } catch (err) { console.error(err); }
    } 
});

// 👇 यह वाला हिस्सा आपसे डिलीट हो गया था, मैंने वापस लगा दिया है 👇
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready! Fetching feed with Axios...');

    try {
        // 1. Axios से XML डेटा डाउनलोड करें (User-Agent के साथ)
        const response = await axios.get('https://cgsarkari.com/feed.xml', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        const xmlData = response.data;

        // 2. XML से टाइटल और लिंक निकालने का देसी जुगाड़ (Regex)
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;

        let items = [];
        let match;
        while ((match = itemRegex.exec(xmlData)) !== null) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(titleRegex);
            const linkMatch = itemContent.match(linkRegex);

            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim(),
                    link: linkMatch[1].trim()
                });
            }
        }

        if (items.length === 0) {
            console.log('❌ No items found in XML!');
            return;
        }

        let newPosts = items.filter(post => !sentPosts.includes(post.link)).slice(0, 10);

        if (newPosts.length === 0) {
            console.log('😴 सब कुछ अप-टू-डेट है।');
        } else {
            console.log(`📤 ${newPosts.length} नई पोस्ट मिली हैं!`);
            newPosts.reverse();

            for (let post of newPosts) {
                const msg = `🚨 *छत्तीसगढ़ ताज़ा अपडेट* 🚨\n\n📌 *${post.title}*\n\n👇 *पूरी जानकारी यहाँ देखें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group!*`;
                
                await client.sendMessage(MY_GROUP_ID, msg);
                console.log(`✅ Sent: ${post.title}`);
                sentPosts.push(post.link);
                await delay(5000); // 5 सेकंड का गैप
            }

            if (sentPosts.length > 100) sentPosts = sentPosts.slice(-100);
            fs.writeFileSync(SENT_POSTS_FILE, JSON.stringify(sentPosts, null, 2));
        }

    } catch (error) {
        console.error('❌ Error occurred but saving session:', error.message);
    } finally {
        console.log('🛑 Task Done. Closing bot and SAVING session...');
        await client.destroy();
        process.exit(0); // 0 मतलब सक्सेस, ताकि गिटहब सेशन सेव कर ले
    }
});

client.initialize();
