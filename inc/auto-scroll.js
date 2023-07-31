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
		await new Promise((resolve, reject) => {
            const element = document.querySelector('[role="feed"]');
			let totalHeight = 0;
			let distance = 35;
			let timer = setInterval(() => {
				element.scrollBy(0, distance);
				totalHeight += distance;

				// Check if end of list message is visible
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
	});
}

module.exports = {autoScroll, autoScrollMap};