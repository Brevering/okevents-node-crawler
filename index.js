const puppeteer = require('puppeteer');
const CREDS = require('./creds');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { Axios } = require('axios');
const downloadPath = path.resolve('./output');
var axios = require('axios');

async function run() {
	console.log(downloadPath);
	const browser = await puppeteer.launch({
		headless: false
	});
	const page = await browser.newPage();
	const USERNAME_SELECTOR = '#email';
	const PASSWORD_SELECTOR = '#pass';
	const BUTTON_SELECTOR = '#loginbutton';
	const searchUrl = `https://www.facebook.com/toplocentralata/events`;

	//!const anchorsSelector = 'a[href^="https://www.facebook.com/events"] img';
	const anchorsSelector = '[role="main"] [role="main"] a[href^="/events"] img';

	const context = browser.defaultBrowserContext();
	context.overridePermissions("https://www.facebook.com", ["geolocation", "notifications"]);

	//!log in fb
	await page.goto('https://facebook.com/login');
	const cookieButton = await page.$('[aria-label="Only allow essential cookies"]');
	if (cookieButton) {
		await cookieButton.click();
	} else {
		const cookieButton2 = await page.$('[title="Only allow essential cookies"]');
		if (cookieButton2) {
			await cookieButton2.click();
		} else {
			const cookieButton3 = await page.$('[data-cookiebanner="accept_only_essential_button"]');
			if (cookieButton3) {
				await cookieButton3.click();
			}
		}
	}
	await new Promise(r => setTimeout(r, 1 * 1000));
	await page.click(USERNAME_SELECTOR);
	await page.keyboard.type(CREDS.username);
	await page.click(PASSWORD_SELECTOR);
	await page.keyboard.type(CREDS.password);

	await page.click(BUTTON_SELECTOR);

	await page.waitForNavigation();

	//! go to toplocentrala
	// await page.goto(searchUrl);
	// await page.setViewport({
	// 	width: 1200,
	// 	height: 800
	// });

	await page.goto('https://www.facebook.com/events/interested', { waitUntil: ['networkidle0'] });
	await page.setViewport({
		width: 1200,
		height: 800
	});


	async function autoScroll(page) {
		await page.evaluate(async () => {
			await new Promise((resolve) => {
				var totalHeight = 0;
				var distance = 100;
				var timer = setInterval(() => {
					var scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;
					if (totalHeight >= scrollHeight - window.innerHeight) {
						debugger
						clearInterval(timer);
						resolve();
					}
				}, 3000);
			});
		});
	}
	//!scroll to bottom
	await autoScroll(page);

	const lnks = await page.$$eval(anchorsSelector, collection => {
		const outputArray = [];
		for (let i = 0; i < collection.length; i++) {
			const node = collection[i];
			let imgThumb = node.getAttribute('src');
			let baliga;
			
			// GET request for remote image in node.js
			
			let eventLink = node.closest('a') ? node.closest('a').getAttribute('href').split('?')[0] : ''
			outputArray.push({
				'imgThumb': imgThumb,
				'eventLink': 'https://www.facebook.com'+eventLink,
			})
		}
		return outputArray
	});

	for (let index = 0; index < lnks.length; index++) {
		const element = lnks[index];
		await axios.get( element.imgThumb,{
			method: 'get',
			url: element.imgThumb,
			responseType: 'arraybuffer'
		})
			.then(function (response) {
				element.imgThumb = 'data:image/png;base64,' + Buffer.from(response.data, 'binary').toString('base64');
			});
	}

	const fn = '' + Date.now();


	//! save img thumb files locally
	// lnks.forEach((lnk , index) => {
	//     const subs1 = lnk.eventLink.split('events/')[1];
	//     const subs2 = subs1.substring(0, subs1.length-1);
	//     https.get(lnk.imgThumb, res => {
	//         const stream = fs.createWriteStream(`output/img/${subs2}.jpg`);
	//         res.pipe(stream);
	//         stream.on('finish', () => {
	//             stream.close();
	//         })
	//     })
	// });

	//! go to each  event detail
	for (const element of lnks) {

		await page.goto(element.eventLink, {waitUntil:['networkidle0']});
	// 	//! get full-size photo url
		const imgt = await page.$eval('[data-imgperflogname="profileCoverPhoto"]' ,imgTag => {
			return imgTag.getAttribute('src');
		})
		await axios.get( imgt,{
			method: 'get',
			url: imgt,
			responseType: 'arraybuffer'
		})
			.then(function (response) {
				element.imgFullSize = 'data:image/png;base64,' + Buffer.from(response.data, 'binary').toString('base64');
			});
	
	// 	//! click interested
		await page.click('[aria-label="Interested"]');
	}
	fs.writeFileSync(`output/json/${fn}.json`, JSON.stringify(lnks));
	//!click "More" then "Save"
	// await page.click('[aria-label="More"]');
	// let baliga = await page.$$eval('[role="menuitem"]', (sel) => {
	//     const nodel = sel.find(x=>x.innerText === 'Add to Calendar');
	// 	if(nodel){
	// 		nodel.click();
	// 	}
	//     return nodel
	// });

	// await page.$$eval('[role="button"]',(sel)=>{
	// 	const addtc = sel.find(x=> x.innerHTML.includes('Add to Calendar'));
	// 	if(addtc){
	// 		addtc.click();
	// 	}
	// })
	// const dld = await page.$('[download]');

	//! go to the full events page
	// await page.goto('https://www.facebook.com/events/interested', { waitUntil: ['networkidle0'] })
	//! click the Add to calendar button
	//await page.click('[aria-label="Add to Calendar"]');
	//! download the ics file
	// const icsAddress = await page.$eval('[aria-label="Add to Calendar"]', btn => {

	// 	const btnHref = btn?.getAttribute('href');
	// 	if (btnHref) {
	// 		return btnHref;
	// 	}
	// });

	await new Promise(r => setTimeout(r, 15 * 1000));

	//console.log(icsAddress);
	//await page.goto(icsAddress);

	// const client = await page.target().createCDPSession()
	// await client.send('Page.setDownloadBehavior', {
	// behavior: 'allow',
	// downloadPath: __dirname + './myAwesomeDownloadFolder',
	// })

	// https.get('https://www.facebook.com/events/ical/upcoming/?uid=1313832498&key=l1irRHW0ExO9mMBj', res => {
	// 	const stream = fs.createWriteStream(`output/ics/${'boobs'}.ics`);
	// 	res.pipe(stream);
	// 	stream.on('finish', () => {
	// 		stream.close();
	// 	}) __dirname + "./", // referenced from
	// })

	//!'a[href^="https://www.facebook.com/events/ical"]'



	browser.close();
}

run();