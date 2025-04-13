const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('./driver');
const { waitForExtensionLoaded, navigateToTestPage } = require('./helpers');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('File Upload Protection Tests', function () {
    this.timeout(30000);
    let driver;
    let testFilePath;

    before(async function () {
        // Create a test file with PII content
        const tempDir = os.tmpdir();
        testFilePath = path.join(tempDir, 'test-sensitive-file.py');
        const content = 'This file contains sensitive information: Credit Card: 4111111111111111, SSN: 123-45-6789, Email: test@example.com';
        fs.writeFileSync(testFilePath, content);
        
        driver = await createDriver();
        await waitForExtensionLoaded(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    it('should detect PII in uploaded files and show warning', async function () {
        // Navigate to a test page with file upload
        await navigateToTestPage(driver, 'https://ps.uci.edu/~franklin/doc/file_upload.html');
        await driver.sleep(10000);

        // Find file input and upload the test file
        const fileInput = await driver.findElement(By.xpath('//input[@type="file"]'));
        await fileInput.sendKeys(testFilePath);
        
        // Check if the popup is displayed
        const popup = await driver.findElement(By.id('pii-blocker-popup'));
        expect(await popup.isDisplayed()).to.be.true;
        
        const popupText = await popup.getText();
        expect(popupText).to.include('sensitive information');
        
        // Test blocking functionality
        const blockButton = await popup.findElement(By.xpath("//button[contains(text(), 'Block Upload')]"));
        await blockButton.click();
        
        // Verify upload was blocked (could check for success message or status element)
        const blockMessage = await driver.findElement(By.xpath("//div[contains(text(), 'File upload blocked')]"));
        expect(await blockMessage.isDisplayed()).to.be.true;
    });
});