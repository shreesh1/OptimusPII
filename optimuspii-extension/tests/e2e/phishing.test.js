const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('./driver');
const { waitForExtensionLoaded, getExtensionUrl } = require('./helpers');

describe('Phishing URL Detection Tests', function () {
    this.timeout(30000);
    let driver;
    // let extensionUrl;

    before(async function () {
        driver = await createDriver();
        await waitForExtensionLoaded(driver);
        // extensionUrl = await getExtensionUrl(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('should detect and block a phishing URL', async function () {
        // Try to navigate to a URL with common phishing characteristics
        const phishingUrl = 'https://appleid-verify.com/account/update?session=7a2b3c';
        await driver.get(phishingUrl);
        
        // Should be redirected to warning page
        await driver.wait(until.urlContains('warning.html'), 5000);
        
        // // Check warning page elements
        // const warningTitle = await driver.findElement(By.css('.warning-title'));
        // expect(await warningTitle.getText()).to.include('Phishing');
        
        const urlDetails = await driver.findElement(By.id('dangerous-url'));
        expect(await urlDetails.getText()).to.include('appleid-verify.com');
    });

    it('should allow navigation to safe URLs', async function () {
        // Navigate to a known safe URL
        const safeUrl = 'https://www.google.com';
        await driver.get(safeUrl);
        
        // Should complete navigation to Google
        await driver.wait(until.titleContains('Google'), 5000);
        
        // Verify we reached the actual page, not a warning
        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).to.include('google.com');
        expect(currentUrl).to.not.include('warning.html');
    });
});