const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer') 
const {autoScroll} = require('./auto-scroll');
const { writeToFile } = require('./helpers');

puppeteer.use(StealthPlugin());

async function getContactLinks(url) {
    let browser;
    console.log('getting contact links');
    try {
        
        browser = await puppeteer.launch({
            headless: false,
<<<<<<< HEAD
            executablePath: executablePath(),
            userDataDir: 'D:\\puppeteer',
            args: [
=======
			userDataDir: '../puppeteer-DELETE',
			args: [
>>>>>>> 5f799c570f3dbc5393b47d60e20141b1df146bb8
				'--disable-extensions',
				'--disable-component-extensions-with-background-pages',
				'--disable-default-apps',
				'--mute-audio',
				'--no-default-browser-check',
				'--autoplay-policy=user-gesture-required',
				'--disable-background-timer-throttling',
				'--disable-backgrounding-occluded-windows',
				'--disable-notifications',
				'--disable-background-networking',
				'--disable-breakpad',
				'--disable-component-update',
				'--disable-domain-reliability',
				'--disable-sync',
                '--ignore-certificate-errors',
<<<<<<< HEAD
                '--incognito',
=======
				'--incognito',
				'--no-sandbox',
				'--disable-setuid-sandbox',
>>>>>>> 5f799c570f3dbc5393b47d60e20141b1df146bb8
			]
        });

        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();
<<<<<<< HEAD
        
=======

>>>>>>> 5f799c570f3dbc5393b47d60e20141b1df146bb8
        const cookies = await page.cookies();
		cookies.forEach(page.deleteCookie);

        page.on('dialog', async dialog => {
           await dialog.accept();
        });

        // await page.setDefaultNavigationTimeout(0);

        await page.goto(url, { waitUntil: ['networkidle2', 'load'] });

        // Scroll to the bottom of the page
        await autoScroll(page);

        const allLinks = await page.$$eval('a', (anchors) => {
			return anchors
				.filter(
					(anchor) =>
						anchor.href.toLowerCase().includes('contact') ||
						anchor.text.toLowerCase().includes('contact') &&
						!anchor.href.toLowerCase().includes('mailto:') &&
						!anchor.href.toLowerCase().includes('tel:') &&
						!anchor.href.toLowerCase().includes('google.com/maps') &&
						!anchor.href.toLowerCase().includes('support.google.com') &&
						(anchor.href.toLowerCase().includes('facebook.com') &&
							!anchor.href.toLowerCase().includes('facebook.com/groups') &&
							!anchor.href.toLowerCase().includes('/reviews/') &&
							!anchor.href.toLowerCase().includes('/sharer/'))
				)
				.map((anchor) => anchor.href);
		});

        allLinks.push(url);

        let uniqueContactLinks = Array.from(new Set(allLinks));

        // Normalizing relative URLs
        uniqueContactLinks = uniqueContactLinks.map(link => {
            if (!link.startsWith('http')) {
                const baseUrl = new URL(url).origin;
                link = new URL(link, baseUrl).href;
            }
            return link;
        });

        // Reorder the array so that the Facebook links come last
        uniqueContactLinks = uniqueContactLinks.sort((a, b) => (a.includes('facebook') === b.includes('facebook')) ? 0 : a.includes('facebook') ? 1 : -1);

        console.log("Links found: ", uniqueContactLinks);
        return uniqueContactLinks;
    } catch (error) {
        console.error('An error occurred:', error);
        await writeToFile(path.join(__dirname, 'error.log'), `${error.toString()} --- ${url} | getContactLinks()\n`);
        return "ERROR";
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = getContactLinks;