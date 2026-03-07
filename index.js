const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// आपका ग्रुप ID
const MY_GROUP_ID = '120363422432475431@g.us';
const SENT_POSTS_FILE = './sent_posts.json';

// पुरानी भेजी गई पोस्ट का डेटा लोड करें
let sentPosts = [];
if (fs.existsSync(SENT_POSTS_FILE)) {
    try {
        sentPosts = JSON.parse(fs.readFileSync(SENT_POSTS_FILE, 'utf-8'));
    } catch (e) {
        console.error('Error reading sent_posts.json', e);
    }
}

// ⏱️ WhatsApp Ban से बचने के लिए टाइमर (Delay function)
const delay = ms => new Promise(res => setTimeout(res, ms));

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

// 👇 मल्टीपल (All New) पोस्ट भेजने का जादू 👇
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready! Fetching live website feed...');

    try {
        // 1. लाइव RSS Feed पढ़ें
        const feed = await parser.parseURL('https://cgsarkari.com/feed.xml');

        if (!feed.items || feed.items.length === 0) {
            console.log('❌ No posts found in the RSS feed!');
            throw new Error("Empty feed");
        }

        let newPostsToSend = [];

        // 2. टॉप 10 पोस्ट चेक करें (ताकि कोई भी नई पोस्ट न छूटे)
        for (let i = 0; i < Math.min(10, feed.items.length); i++) {
            let post = feed.items[i];
            
            // अगर पोस्ट का लिंक हमारी याददाश्त (sentPosts) में नहीं है, तो इसे नई लिस्ट में डालो
            if (!sentPosts.includes(post.link)) {
                newPostsToSend.push(post);
            }
        }

        // 3. चेक करें कि कुछ नया मिला या नहीं?
        if (newPostsToSend.length === 0) {
            console.log('😴 वेबसाइट की सारी ताज़ा पोस्ट पहले ही ग्रुप में भेजी जा चुकी हैं। कोई नया अपडेट नहीं।');
        } else {
            console.log(`📤 ${newPostsToSend.length} नई लाइव पोस्ट मिली हैं! एक-एक करके ग्रुप में भेज रहा हूँ...`);

            // लिस्ट को उल्टा (Reverse) करें ताकि जो पोस्ट पहले पब्लिश हुई थी, वो पहले ग्रुप में जाए
            newPostsToSend.reverse();

            // 4. सभी नई पोस्ट को एक-एक करके भेजें
            for (let post of newPostsToSend) {
                const messageBody = `🚨 *छत्तीसगढ़ ताज़ा अपडेट (Live)* 🚨\n\n📌 *${post.title}*\n\n👇 *पूरी जानकारी और PDF के लिए यहाँ क्लिक करें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group for fastest updates!*`;

                // मैसेज भेजें
                await client.sendMessage(MY_GROUP_ID, messageBody);
                console.log(`✅ Successfully sent: ${post.title}`);

                // याददाश्त में सेव करें
                sentPosts.push(post.link);

                // ⏱️ बहुत ज़रूरी: एक साथ कई मैसेज भेजने से WhatsApp बैन कर सकता है। इसलिए हर मैसेज के बीच 5 सेकंड रुकें।
                await delay(5000); 
            }

            // मेमोरी फुल ना हो इसलिए सिर्फ आखिरी 100 पोस्ट की याददाश्त रखेंगे
            if (sentPosts.length > 100) {
                sentPosts = sentPosts.slice(sentPosts.length - 100); 
            }
            
            // JSON फाइल में सेव कर दें
            fs.writeFileSync(SENT_POSTS_FILE, JSON.stringify(sentPosts, null, 2));
            console.log('💾 Sent posts memory updated!');
        }

    } catch (error) {
        console.error('❌ Error during live auto-posting:', error);
    } finally {
        // काम खत्म होते ही बॉट बंद
        console.log('🛑 Task completed. Closing bot to finish Action...');
        await client.destroy();
        process.exit(0);
    }
});

client.initialize();
