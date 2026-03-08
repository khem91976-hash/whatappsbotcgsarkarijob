const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');

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

// QR कोड अब नहीं चाहिए क्योंकि लॉगिन सेव हो चुका है
client.on('qr', () => { console.log('QR Code requested, but session should be cached!'); });

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');

    try {
        console.log('🌐 Internal Chrome (Puppeteer) से वेबसाइट खोल रहा हूँ ताकि कोई ब्लॉक न कर सके...');
        
        // 1. WhatsApp के ही क्रोम ब्राउज़र में नया टैब (Tab) खोलें
        const browser = client.pupBrowser;
        const page = await browser.newPage();
        
        // वेबसाइट को लगे कि यह असली इंसान है
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 2. आपकी वेबसाइट के feed.xml पर जाएँ
        const response = await page.goto('https://cgsarkari.com/feed.xml', { waitUntil: 'domcontentloaded' });
        
        // 3. वेबसाइट से XML डेटा निकालें
        const xmlData = await response.text();
        await page.close(); // टैब बंद कर दें

        // 4. देसी जुगाड़ (Regex) से टाइटल, लिंक और डेट (Date) छांटें
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const dateRegex = /<pubDate>(.*?)<\/pubDate>/; // 👈 डेट के लिए नया कोड

        let items = [];
        let match;
        while ((match = itemRegex.exec(xmlData)) !== null) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(titleRegex);
            const linkMatch = itemContent.match(linkRegex);
            const dateMatch = itemContent.match(dateRegex); // 👈 डेट निकालें

            if (titleMatch && linkMatch) {
                // डेट को साफ़-सुथरा बनाने का लॉजिक
                let postDate = "Live Update";
                if (dateMatch) {
                    try {
                        let d = new Date(dateMatch[1]);
                        postDate = d.toLocaleDateString('en-IN'); // इससे डेट 08/03/2026 जैसी दिखेगी
                    } catch(e) {}
                }

                items.push({
                    title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim(),
                    link: linkMatch[1].trim(),
                    date: postDate // 👈 डेट को डेटा में सेव किया
                });
            }
        }

        if (items.length === 0) {
            console.log('❌ XML में कोई पोस्ट नहीं मिली! वेबसाइट ने शायद HTML पेज दे दिया है।');
            throw new Error("No items parsed");
        }

        // 5. डुप्लीकेट रोकने का लॉजिक: टॉप 10 में से सिर्फ "नई" पोस्ट निकालें (जो पहले नहीं भेजी)
        let newPosts = items.filter(post => !sentPosts.includes(post.link)).slice(0, 10);

        if (newPosts.length === 0) {
            console.log('😴 सब कुछ अप-टू-डेट है। कोई नई पोस्ट नहीं।');
        } else {
            console.log(`📤 ${newPosts.length} नई पोस्ट मिली हैं! ग्रुप में भेज रहा हूँ...`);
            newPosts.reverse(); // सबसे पुरानी पहले भेजें

            for (let post of newPosts) {
                // 👈 मैसेज में अब 'दिनांक' भी जुड़ गया है
                const msg = `🚨 *छत्तीसगढ़ ताज़ा अपडेट* 🚨\n\n📌 *${post.title}*\n📅 *दिनांक:* ${post.date}\n\n👇 *पूरी जानकारी यहाँ देखें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group!*`;
                
                await client.sendMessage(MY_GROUP_ID, msg);
                console.log(`✅ Sent Successfully: ${post.title}`);
                
                sentPosts.push(post.link);
                await delay(5000); // WhatsApp बैन से बचने के लिए 5 सेकंड का गैप
            }

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
