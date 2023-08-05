const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer') 
const {autoScroll} = require('./auto-scroll');
const { writeToFile } = require('./helpers');
const fs = require('fs-extra');

puppeteer.use(StealthPlugin());

async function getContactLinks(url) {
    let browser;
    console.log('getting contact links');
    let chromeTmpDataDir = null;
    try {
        
        browser = await puppeteer.launch({
            headless: false,
            executablePath: executablePath(),
            args: [ '--ignore-certificate-errors' ]
        });

        
		let chromeSpawnArgs = browser.process().spawnargs;
		for (let i = 0; i < chromeSpawnArgs.length; i++) {
			if (chromeSpawnArgs[i].indexOf("--user-data-dir=") === 0) {
				chromeTmpDataDir = chromeSpawnArgs[i].replace("--user-data-dir=", "");
			}
		}

        const page = await browser.newPage();

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
            if (fs.statSync(chromeTmpDataDir).isDirectory()) {
                // If so, try to delete the folder recursively
                fs.rm(chromeTmpDataDir, { recursive: true, force: true }, (err) => {
                  if (err) {
                    console.error('Error deleting folder:', chromeTmpDataDir, err);
                  } else {
                    console.log('Successfully deleted folder:', chromeTmpDataDir);
                  }
                });
              }
        }
    }
}

module.exports = getContactLinks;