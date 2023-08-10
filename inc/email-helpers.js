const axios = require('axios');
const he = require('he');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const https = require('https');
const {autoScroll} = require('./auto-scroll');
const fs = require('fs-extra');

const agent = new https.Agent({  
	rejectUnauthorized: false
  });

const invalidLocalParts = [
	'the',
	'2',
	'3',
	'4',
	'123',
	'20info',
	'aaa',
	'ab',
	'abc',
	'acc',
	'acc_kaz',
	'account',
	'accounts',
	'accueil',
	'ad',
	'adi',
	'adm',
	'an',
	'and',
	'available',
	'b',
	'c',
	'cc',
	'com',
	'domain',
	'domen',
	'email',
	'fb',
	'foi',
	'for',
	'found',
	'g',
	'get',
	'h',
	'here',
	'includes',
	'linkedin',
	'mailbox',
	'more',
	'my_name',
	'n',
	'name',
	'need',
	'nfo',
	'ninfo',
	'now',
	'o',
	'online',
	'post',
	'rcom.TripResearch.userreview.UserReviewDisplayInfo',
	's',
	'sales2',
	'test',
	'up',
	'we',
	'www',
	'xxx',
	'xxxxx',
	'y',
	'username',
	'firstname.lastname',
	'your.name',
	'your',
	'donotreply',
];

const invalidDomainParts = [
	'email.com',
	'domain.com',
	'yourdomain.com',
	'sentry-next.wixpress.com',
	'mysite.com',
	'sentry.io',
	'sentry.wixpress.com',
	'example.com',
];

const prepareEmails = (emails, domain) => {
	let validEmails = [];

	for (let i = 0; i < emails.length; i++) {
		let email = emails[i].toLowerCase().trim();

		const emailDomain = email.split('@')[1].trim();

		console.log(
			'Domain = ' + emailDomain,
			invalidDomainParts.indexOf(emailDomain) === -1
		);

		if (
			!validEmails.includes(email) &&
			(!domain || email.indexOf(domain) >= 1)
		) {
			let ext = email.slice(-4);
			if (
				ext !== '.png' &&
				ext !== '.jpg' &&
				ext !== '.gif' &&
				ext !== '.css'
			) {
				ext = email.slice(-3);
				if (ext !== '.js') {
					let tempEmail = email.replace(/^(x3|x2|u003|u0022)/i, '');
					tempEmail = tempEmail.replace(/^sx_mrsp_/i, '');
					tempEmail = tempEmail.replace(/^3a/i, '');

					if (tempEmail !== email) {
						email = tempEmail;
					}
					if (
						email.search(
							/\b[a-z\d-][_a-z\d-+]*(?:\.[_a-z\d-+]*)*@[a-z\d]+[a-z\d-]*(?:\.[a-z\d-]+)*(?:\.[a-z]{2,63})\b/i
						) === -1 ||
						email.search(/(no|not)[-|_]*reply/i) !== -1 ||
						email.search(/mailer[-|_]*daemon/i) !== -1 ||
						email.search(/reply.+\d{5,}/i) !== -1 ||
						email.search(/\d{13,}/i) !== -1 ||
						email.indexOf('.crx1') > 0 ||
						email.indexOf('.webp') > 0 ||
						email.indexOf('nondelivery') > 0 ||
						email.indexOf('@linkedin.com') > 0 ||
						email.indexOf('@email.com') > 0 ||
						email.indexOf('@sentry.') > 0 ||
						email.indexOf('@linkedhelper.com') > 0 ||
						email.indexOf('feedback') > 0 ||
						email.indexOf('notification') > 0 ||
						email.indexOf('wixpress') > 0
					) {
						ext = email.substring(0, email.indexOf('@'));

						console.log('ext = ' + ext);

						if (
							invalidLocalParts.indexOf(ext) === -1 &&
							email !== '' &&
							!validEmails.includes(email) &&
							invalidDomainParts.indexOf(emailDomain) === -1
						) {
							validEmails.push(email);
						}
					} else {
						if (invalidDomainParts.indexOf(emailDomain) === -1) {
							validEmails.push(email);
						}
					}
				}
			}
		}
	}
	console.log(validEmails);
	return validEmails;
};

async function fetchAndDecodeHTMLPuppeteer(url) {
	console.log('Using Puppeteer...');
	let browser;
	let chromeTmpDataDir = null;
	try {
		puppeteer.use(StealthPlugin());
		browser = await puppeteer.launch({ 
			headless: false,
			args: [ '--ignore-certificate-errors' ]
		});

		
		let chromeSpawnArgs = browser.process().spawnargs;
		for (let i = 0; i < chromeSpawnArgs.length; i++) {
			if (chromeSpawnArgs[i].indexOf("--user-data-dir=") === 0) {
				chromeTmpDataDir = chromeSpawnArgs[i].replace("--user-data-dir=", "");
			}
		}

		page = await browser.newPage();

		page.on('dialog', async dialog => {
			await dialog.accept();
		});

		await page.goto(url, { waitUntil: ['load', 'networkidle2'] });
		
		await autoScroll(page);

		const content = await page.content();
		const decodedString = he.decode(content);
		console.log('Close puppeteer browser');
		return decodedString;
	} catch (error) {
		console.error('Error:', error.message);
		return null;
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

async function searchEmails(url) {
	console.log('Fetching ' + url);
	try {
		const response = await axios.get(url, { httpsAgent: agent });
		console.log('Status:', response.status);
		if (response.status === 404) {
			console.log('Page not found:', url);
			return null;
		}

		let text = typeof response.data === 'string' ? he.decode(response.data) : 'No Value';
        text = text.replace(/\\n/gi, ' ');

		let emails = text.match(
			/\b[a-z\d-][_a-z\d-+]*(?:\.[_a-z\d-+]*)*@[a-z\d]+[a-z\d-]*(?:\.[a-z\d-]+)*(?:\.[a-z]{2,63})\b/gi
		);

		console.log('Emails Found:', emails);

		// Check emails on current page
		if (emails && emails.length > 0) {
			return prepareEmails(emails);
		} else {
			let puppeteerData = await fetchAndDecodeHTMLPuppeteer(url);
			puppeteerData = puppeteerData.replace(/\\n/gi, ' ');

			let emailsPuppeteer = puppeteerData.match(
				/\b[a-z\d-][_a-z\d-+]*(?:\.[_a-z\d-+]*)*@[a-z\d]+[a-z\d-]*(?:\.[a-z\d-]+)*(?:\.[a-z]{2,63})\b/gi
			);

			if (emailsPuppeteer && emailsPuppeteer.length > 0) {
				console.log('Puppeteer emails ', emailsPuppeteer);
				return prepareEmails(emailsPuppeteer);
			}
			
			return 'No Value';
		}
	} catch (error) {
		console.log('Error searching emails:', error);
	}
}

module.exports = searchEmails;