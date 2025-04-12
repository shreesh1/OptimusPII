const { By, Key } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('./driver');
const { waitForExtensionLoaded, navigateToTestPage } = require('./helpers');

describe('Paste Protection Tests', function () {
    this.timeout(30000);
    let driver;

    before(async function () {
        driver = await createDriver();
        await waitForExtensionLoaded(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('should detect PII content and show interactive popup', async function () {
        await navigateToTestPage(driver, 'https://chatgpt.com/');
        await driver.sleep(5000);
        const pasteArea = await driver.findElement(By.xpath('//div[@contenteditable="true"]'));
        await pasteArea.click();

        // Copy data with various PII formats to clipboard
        await driver.executeScript("navigator.clipboard.writeText('yo example@gmail.com yo 5555555555554444 yo 9999999999 yo 123-45-6789 yo A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 yo 123456781234 yo ABCDE1234F yo P@ssw0rd567');");

        // Simulate paste using Ctrl+V
        pasteArea.sendKeys(Key.CONTROL, 'v');
        
        // Wait for the popup to appear
        await driver.sleep(1000);
        
        // Check if the popup is displayed
        const popup = await driver.findElement(By.id('pii-detector-popup'));
        expect(await popup.isDisplayed()).to.be.true;
        
        // Verify that sensitive information is highlighted in the popup
        const highlightedContent = await popup.findElements(By.css('mark'));
        expect(highlightedContent.length).to.be.greaterThan(0);
        
        // Click on "Redact & Paste" button
        const redactButton = await popup.findElement(By.xpath("//button[contains(text(), 'Redact & Paste')]"));
        await redactButton.click();
        
        // Wait for the redacted content to be pasted
        await driver.sleep(1000);
        
        // Check if the notification was shown (optional)
        // const notification = await driver.findElement(By.css('.pii-notification'));
        // expect(await notification.isDisplayed()).to.be.true;
        
        // Verify the redacted content was pasted
        const pastedContent = await pasteArea.getText();
        expect(pastedContent).to.include('redacted');
    });
});