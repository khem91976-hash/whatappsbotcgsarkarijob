const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); // 👈 QR कोड जनरेटर वापस ले आया हूँ!
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

const todayDateString = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

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
            '--single-process',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ]
    }
});

// 👇 यह हिस्सा वापस आ गया है, अब आपको टर्मिनल में QR दिखेगा
client.on('qr', qr => { 
    console.log('⚠️ नया QR Code जनरेट हुआ है! कृपया इसे स्कैन करें:');
    qrcode.generate(qr, { small: true }); 
});

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');
    console.log(`📅 आज की डेट सेट की गई है: ${todayDateString}`);

    try {
        console.log('🌐 Internal Chrome (Puppeteer) से वेबसाइट खोल रहा हूँ...');
        
        const browser = client.pupBrowser;
        const waPage = client.pupPage; 
        
        const newPage = await browser.newPage();
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const response = await newPage.goto('https://cgsarkari.com/feed.xml', { waitUntil: 'domcontentloaded' });
        const xmlData = await response.text();
        await newPage.close(); 

        console.log('🔄 WhatsApp टैब को वापस सामने (Focus) ला रहा हूँ...');
        await waPage.bringToFront();
        
        console.log('⏳ WhatsApp कनेक्शन रिफ्रेश होने के लिए 15 सेकंड इंतज़ार कर रहा हूँ...');
        await delay(15000); 

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
            throw new Error("No items parsed");
        }

        let newPosts = items.filter(post => post.date === todayDateString && !sentPosts.includes(post.link)).slice(0, 10);

        if (newPosts.length === 0) {
            console.log('😴 आज की कोई भी नई पोस्ट नहीं मिली या सब भेजी जा चुकी हैं।');
        } else {
            console.log(`📤 आज की ${newPosts.length} नई पोस्ट मिली हैं! ग्रुप में भेज रहा हूँ...`);
            newPosts.reverse(); 

            for (let post of newPosts) {
                const msg = `🚨 *छत्तीसगढ़ ताज़ा अपडेट* 🚨\n\n📌 *${post.title}*\n📅 *दिनांक:* ${post.date}\n\n👇 *पूरी जानकारी यहाँ देखें:*\n🔗 ${post.link}\n\n🌐 *Join CGSarkari WhatsApp Group!*`;
                
                await client.sendMessage(MY_GROUP_ID, msg);
                console.log(`✅ Sent Successfully: ${post.title}`);
                
                sentPosts.push(post.link);
                await delay(8000); 
            }

            if (sentPosts.length > 100) sentPosts = sentPosts.slice(-100);
            fs.writeFileSync(SENT_POSTS_FILE, JSON.stringify(sentPosts, null, 2));
            
            console.log('⏳ सभी मैसेज भेज दिए! सर्वर तक पहुँचने के लिए 10 सेकंड रुक रहा हूँ...');
            await delay(10000); 
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
