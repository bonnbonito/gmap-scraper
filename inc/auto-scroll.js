const { writeToFile } = require('./helpers');

const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const autoScrollMap = async (page) => {
	return await page.evaluate(async () => {
		let linkElements;
		try {
			await new Promise((resolve, reject) => {
				const element = document.querySelector('[role="feed"]');
				let totalHeight = 0;
				let distance = 35;
				let timer = setInterval(() => {
					element.scrollBy(0, distance);
					totalHeight += distance;
                
					linkElements = Array.from(document.querySelectorAll('[role="feed"] a'));

					let endOfListArray = Array.from(
						document.querySelectorAll('span')
					).filter(
						(el) => el.innerText === "You've reached the end of the list."
					);
					const endOfList = endOfListArray.length > 0 ? endOfListArray[0] : null;
	
					if (endOfList) {
						clearInterval(timer);
						resolve();
					}

				}, 100);
			});
		} catch (error) {
			console.log("Error occurred while scrolling: ", error);
			await writeToFile(path.join(__dirname, 'error.log'), `${error.toString()} --- autoScrollMap()\n`);
		}
		
		// Return the gathered link elements regardless of any error during scrolling
		return linkElements.map(a => a.href); // Map array of elements to array of href strings
	});
}


module.exports = {autoScroll, autoScrollMap};