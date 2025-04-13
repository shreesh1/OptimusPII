const { until, By } = require('selenium-webdriver');

async function waitForExtensionLoaded(driver) {
  // Wait for extension to be loaded
  await driver.sleep(5000); // Basic wait for extension initialization
}

async function navigateToTestPage(driver, page) {
  await driver.get(page);
  await driver.wait(until.elementLocated(By.tagName('body')));
}

module.exports = {
  waitForExtensionLoaded,
  navigateToTestPage
};