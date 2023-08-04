const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { extractPlaceID } = require('./inc/helpers');
const { autoScrollMap } = require('./inc/auto-scroll');
const getContactLinks = require('./inc/get-contact-links');
const searchEmails = require('./inc/email-helpers');
const filename = 'canada-states.csv';

const CONFIG = {
    mapUrl: 'https://www.google.com/maps/search/',
    query: 'interior designer',
    inputFilename: filename,
    outputFilename: `./output/output-${filename}`,
    processedStatesFile: 'processedStates.txt'
};

const processedPlaces = new Set();
let processedStates = new Set();

async function loadProcessedStates() {
    if (fs.existsSync(CONFIG.processedStatesFile)) {
        const content = await fs.promises.readFile(CONFIG.processedStatesFile, 'utf8');
        processedStates = new Set(content.split('\n').map(state => state.trim()));
		console.log(processedStates);
    }
}

async function writeToFile(filename, content) {
    try {
        await fs.promises.appendFile(filename, content);
        console.log(`Successfully wrote data to ${filename}`);
    } catch (error) {
        console.error(`Error writing to file ${filename}:`, error);
    }
}

async function openPuppeteer(url) {
    let browser = null;

    try {
        puppeteer.use(StealthPlugin());
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        await page.setViewport({ width: 1200, height: 900 });
        await page.goto(url, { waitUntil: 'networkidle0' });

        const results = await parsePlaces( page );
        
        console.log('===================ParsePlaces================');

        const data = results.length > 0 ? await getPlacesData(results, page ) : [];

        console.log(data);

    } catch (error) {
        console.error('An error occurred:', error);
        await writeToFile(path.join(__dirname, 'error.log'), `${error.toString()} --- ${url} | openPuppeteer()\n`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}


async function parsePlaces(page) {
    let links;

    const hasFeed = await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        return !!feed;
    });

    if (hasFeed) {
        await autoScrollMap(page)
        .then((data) => {
        console.log("Scrolling finished");
        });

        links = await page.evaluate(() => {
            // Extract the href attributes from all anchor tags with role="feed"
            const linkElements = document.querySelectorAll('[role="feed"] a');
            let interiorDesignerLinks = new Set();
    
            for (let i = 0; i < linkElements.length; i++) {
    
                if ( linkElements[i].nextElementSibling?.nextElementSibling?.innerText.toLowerCase().includes('interior designer') ) {
                    interiorDesignerLinks.add(linkElements[i].href);
                }
    
            }
            
            return Array.from(interiorDesignerLinks);
        });
    }

    if (!links || links.length === 0) {
        console.log("No links");
        await page.click('#searchbox-searchbutton');
        links = [page.url()];
    }

    return links;
}


async function getPlacesData( links, page ) {

	const query = "interior designer";

	console.log('Found ' + links.length + ' places');

	// Iterate through each link and click on it sequentially
	for (const link of links) {
        console.log(link);
		const placeID = extractPlaceID(link);

		// If the place has been processed before, skip it
		if (processedPlaces.has(placeID)) {
            console.log('!!!!!!!!! ========= ALREADY EXISTS ========== !!!!!!!!');
			continue;
		}

       

		// Add the placeID to the set of processed places
		processedPlaces.add(placeID);
		console.log('Extracting data from placeID ', link);
		
		await page.goto(link, { waitUntil: 'networkidle0' });

		const placeData = await page.evaluate(() => {
			const name = document.querySelector('h1').innerText;
			const website =
				document.querySelector('a[data-item-id="authority"]')?.href ??
				'No Value';
			const phone = document
				.querySelector('[data-tooltip="Copy phone number"]')?.getAttribute('aria-label')?.replace('Phone:', '') ?? 'No value';
			const address = document
				.querySelector('[data-item-id="address"]')?.getAttribute('aria-label') ?? 'No Value';
			const category = document.querySelector('[jsaction="pane.rating.category"]')?.innerText ?? 'No value';

			return { name, website, phone, address, category };
		});

		console.log(placeData.category);

		if ( ! placeData.category.toLowerCase().includes(query) ) {
			console.log("**Not a "+ query +". -"+ placeData.category +"- Skip**");
			continue;
		}

        console.log('****************');
        console.log(placeData.website?? 'No Website');
        console.log('****************');

		console.log( "A "+ query +"! getting data..." );

		let emails;
		if (placeData.website !== 'No Value' && placeData.category.toLowerCase().includes(query)) {
			let contactLinks = [];
			try {
				contactLinks = await getContactLinks(placeData.website);
			} catch (error) {
				console.error('Error in getContactLinks:', error);
			}

			try {
				for (const link of contactLinks) {
					console.log('Searching email in ', link);
					const data = await searchEmails(link);
					if (Array.isArray(data) && data.length > 0) {
						emails = data.filter((n) => n).join(', ') || 'No Value';
						break;
					}
				}
			} catch (error) {
				console.error('Error in processing contactLinks:', error);
				await writeToFile(path.join(__dirname, 'error.log'), `${error.toString()} --- ${link} | getPlacesData()\n`);
			}
			
		}

		console.log(
			placeID,
			placeData.name,
			placeData.website,
			placeData.phone,
			placeData.address,
			link,
			emails
		);

		const placeOutput = [
			`"${placeID}"`,
			`"${placeData.name}"`,
			`"${placeData.website}"`,
			`"${placeData.phone}"`,
			`"${placeData.address}"`,
			`"${link}"`
		].join(',');

		fs.appendFile(CONFIG.outputFilename, placeOutput + ',' + emails + '\n', (err) => {
			if (err) {
				console.error('Error writing to file:', err);
			} else {
				console.log(`Successfully wrote data for ${placeData.name} to file.`);
			}
		});
	}
}

async function startProcess() {
	try {
		// Load processed zip codes
		await loadProcessedStates();

		// Read the output file and populate the processedPlaces set
		if (fs.existsSync(CONFIG.outputFilename)) {
			const outputContent = await fs.promises.readFile(CONFIG.outputFilename, 'utf8');
			const outputRows = outputContent.split('\n');
			for (let i = 1; i < outputRows.length; i++) {
				const row = outputRows[i].split(',');
				const placeID = row[0].replace(/"/g, '');  // Remove quotes around the ID
				processedPlaces.add(placeID);
			}
		}

		const fileContent = await fs.promises.readFile(CONFIG.inputFilename, 'utf8');
		const rows = fileContent.split('\n');

		for (let i = 0; i < rows.length; i++) {
			try {
				const row = rows[i].split(',');
				const state = row[0].trim();

				// If the zip has been processed before, skip it
				if (processedStates.has(state) ) {
					console.log( 'State done. Skipping..');
					continue;
				}

				if (row.length === 0 ) {
					continue;
				}

				const lat = row[1].trim();
				const lang = row[2].trim();
				const queryText = CONFIG.query.replace(' ', '+');
				const searchUrl =
					CONFIG.mapUrl +
					queryText.replace(' ', '+') +
					'+in+' + state +
					'/@' +
					lat +
					',' +
					lang +
					',13z/data=!4m2!2m1!6e6?entry=ttu';
					
				console.log(searchUrl);

				await openPuppeteer(searchUrl);

				// Add the zip to the set of processed zips
				processedStates.add(state);
				// Append the zip to the processedStatesFile
				fs.appendFile(CONFIG.processedStatesFile, state + '\n', (err) => {
					if (err) {
						console.error('Error writing to file:', err);
					}
				});
			} catch (error) {
				console.error('Error reading row:', error);
			}
		}
	} catch (error) {
		console.error('Error reading or writing file:', error);
	}
}

startProcess();