const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer'); // 👈 अलग से ब्राउज़र के लिए
const fs = require('fs');

const MY_GROUP_ID = '120363422432475431@g.us';
const SENT_POSTS_FILE = './sent_posts.json';

let sentPosts = [];
if (fs.existsSync(SENT_POSTS_FILE)) {
    try { sentPosts = JSON.parse(fs.readFileSync(SENT_POSTS_FILE, 'utf-8')); }
    catch (e) { console.error(e); }
}

const delay = ms => new Promise(res => setTimeout(res, ms));
const todayDateString = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

// 🚀 सारा काम एक Main Function के अंदर
(async () => {
    console.log(`📅 आज की डेट सेट की गई है: ${todayDateString}`);
    console.log('🌐 1. वेबसाइट चेक कर रहा हूँ (WhatsApp चालू करने से पहले)...');

    let xmlData = "";
    try {
        // WhatsApp के बिना, एक हल्का सा ब्राउज़र खोलकर सिर्फ न्यूज़ लाएं
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const response = await page.goto('https://cgsarkari.com/feed.xml', { waitUntil: 'domcontentloaded' });
        xmlData = await response.text();
        await browser.close(); // काम खत्म, ब्राउज़र बंद!
    } catch (err) {
        console.error('❌ वेबसाइट से डेटा निकालने में एरर:', err.message);
        process.exit(1);
    }

    // 2. डेटा को छांटें
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const dateRegex = /<pubDate>(.*?)<\/pubDate>/;

    let items = [];
    let match;
    while ((match = itemRegex.exec(xmlData)) !== null) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(titleRegex);
        const linkMatch = itemContent.match(linkRegex);
        const dateMatch = itemContent.match(dateRegex);

        if (titleMatch && linkMatch) {
            let postDate = "";
            if (dateMatch) {
                try {
                    let d = new Date(dateMatch[1]);
                    postDate = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                } catch(e) {}
            }
            items.push({
                title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim(),
                link: linkMatch[1].trim(),
                date: postDate
            });
        }
    }

    if (items.length === 0) {
        console.log('❌ XML में कोई पोस्ट नहीं मिली!');
        process.exit(0);
    }

    // 3. नई पोस्ट ढूँढें (सिर्फ आज की और जो भेजी न गई हो)
    let newPosts = items.filter(post => post.date === todayDateString && !sentPosts.includes(post.link)).slice(0, 10);

    if (newPosts.length === 0) {
        console.log('😴 आज की कोई भी नई पोस्ट नहीं मिली। WhatsApp को जगाने की ज़रूरत ही नहीं है! बाय-बाय!');
        process.exit(0); // 👈 अगर न्यूज़ नहीं है, तो बॉट यहीं बंद हो जाएगा!
    }

    console.log(`📤 आज की ${newPosts.length} नई पोस्ट मिली हैं! अब 2. WhatsApp चालू कर रहा हूँ...`);

    // 4. अगर न्यूज़ है, तभी WhatsApp चालू करें!
    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.10147.html',
        },
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
        }
    });

    client.on('qr', () => { console.log('⚠️ अगर बॉट अटक जाए, तो नया QR स्कैन करना पड़ सकता है।'); });

    client.on('ready', async () => {
        console.log('✅ WhatsApp Bot is Ready! सीधा मैसेज भेजना शुरू...');
        await delay(20000); // 5 सेकंड रिलैक्स होने दें

        try {
            newPosts.reverse();
            for (let post of newPosts) {
                const msg = `🚨 *छत्तीसगढ़ ताज़ा अपडेट* 🚨\n\n📌 *${post.title}*\n📅 *दिनांक:* ${post.date}\n\n👇 *पूरी जानकारी यहाँ देखें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group!*`;
                
                await client.sendMessage(MY_GROUP_ID, msg);
                console.log(`✅ Sent Successfully: ${post.title}`);
                
                sentPosts.push(post.link);
                await delay(8000); // 8 सेकंड गैप
            }

            if (sentPosts.length > 100) sentPosts = sentPosts.slice(-100);
            fs.writeFileSync(SENT_POSTS_FILE, JSON.stringify(sentPosts, null, 2));
            
            console.log('⏳ सारे मैसेज भेज दिए! 5 सेकंड इंतज़ार कर रहा हूँ...');
            await delay(5000);

        } catch (error) {
            console.error('❌ मैसेज भेजने में एरर:', error);
        } finally {
            console.log('🛑 काम खत्म। Bot बंद कर रहा हूँ और Session Save कर रहा हूँ...');
            await client.destroy();
            process.exit(0);
        }
    });

    client.initialize();
})();
