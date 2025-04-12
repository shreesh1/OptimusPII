const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const path = require('path');
const { createDriver, getExtensionUUID } = require('./driver');
const { waitForExtensionLoaded } = require('./helpers');

describe('Options Page Tests', function () {
    this.timeout(30000);
    let driver;
    let extensionUrl;

    before(async function () {
        // Initialize the driver
        driver = await createDriver();
        await waitForExtensionLoaded(driver);

        // Get the extension UUID to access its pages
        try {
            const uuid = "595108c3-fc1a-46bc-a6f6-918a6b1898aa";
            extensionUrl = `moz-extension://${uuid}/options.html`;
            console.log(`Extension URL: ${extensionUrl}`);
        } catch (error) {
            console.error('Error getting extension UUID:', error);
            throw error;
        }
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('should load the options page', async function () {
        await driver.get(extensionUrl);
        await driver.wait(until.elementLocated(By.css('h1')), 5000);
        const title = await driver.findElement(By.css('h1')).getText();
        expect(title).to.include('OptimusPII');
    });

    it('should have all main navigation tabs', async function () {
        await driver.get(extensionUrl);
        await driver.sleep(2000);
        await driver.wait(until.elementLocated(By.css('.nav-tabs')), 5000);

        // Check if all tabs are present by their text content
        const tabNames = ['Policies', 'Domain Mappings', 'Global Pattern Repository', 'Global Settings', 'Alerts', 'Logs'];
        for (const tabName of tabNames) {
            const tab = await driver.findElement(By.xpath(`//a[contains(text(), '${tabName}')]`));
            expect(await tab.isDisplayed()).to.be.true;
        }
    });

    it('should switch between tabs correctly', async function () {
        await driver.get(extensionUrl);
        await driver.sleep(2000);
        await driver.wait(until.elementLocated(By.css('.nav-tabs')), 5000);

        // Click on each tab by text content and verify the content changes
        const tabMapping = {
            'Domain Mappings': 'Domain Mappings',
            'Global Pattern Repository': 'Global Pattern Repository',
            'Global Settings': 'Global Settings',
            'Logs': 'System Logs'
        };

        for (const [tabLinkText, expectedHeading] of Object.entries(tabMapping)) {
            const tab = await driver.findElement(By.xpath(`//a[contains(text(), '${tabLinkText}')]`));
            await tab.click();
            await driver.wait(until.elementLocated(By.xpath(`//h3[contains(text(), '${expectedHeading}')]`)), 5000);

            // Verify the tab content is displayed
            const heading = await driver.findElement(By.xpath(`//h3[contains(text(), '${expectedHeading}')]`));
            expect(await heading.isDisplayed()).to.be.true;
        }
    });

    it('should toggle dark/light theme', async function () {
        await driver.get(extensionUrl);
        await driver.sleep(2000);

        // Find the theme toggle by its icon or nearby elements
        const themeToggle = await driver.findElement(By.id('theme-switch'));
        
        // Get initial theme
        const body = await driver.findElement(By.css('body'));
        const initialTheme = await body.getAttribute('class');
        
        // Click theme toggle
        await themeToggle.click();
        
        // Verify theme changed
        await driver.sleep(1000); // Wait for theme change
        const newTheme = await body.getAttribute('class');
        expect(newTheme).to.not.equal(initialTheme);
    });

    it('should show unsaved changes indicator when making changes', async function () {
        await driver.get(extensionUrl);
        await driver.sleep(2000);
        await driver.wait(until.elementLocated(By.css('.nav-tabs')), 5000);
        
        // Go to Global Settings tab
        const globalTab = await driver.findElement(By.xpath("//a[contains(text(), 'Global Settings')]"));
        await globalTab.click();
        
        // Find a toggle switch and change it
        const toggleSwitch = await driver.findElement(By.css('input[type="checkbox"]'));
        await toggleSwitch.click();
        
        // Check if unsaved changes indicator appears
        await driver.wait(until.elementLocated(By.css('.unsaved-changes-alert')), 5000);
        const unsavedIndicator = await driver.findElement(By.css('.unsaved-changes-alert'));
        expect(await unsavedIndicator.isDisplayed()).to.be.true;
        expect(await unsavedIndicator.getText()).to.include('unsaved changes');
        
        // Save button should be enabled
        const saveButton = await driver.findElement(By.xpath("//button[contains(text(), 'Apply Changes')]"));
        expect(await saveButton.isEnabled()).to.be.true;
    });

    it('should save changes when clicking Apply Changes', async function () {
        await driver.get(extensionUrl);
        await driver.sleep(2000);
        await driver.wait(until.elementLocated(By.css('.nav-tabs')), 5000);
        
        // Make a change to trigger unsaved state
        const globalTab = await driver.findElement(By.xpath("//a[contains(text(), 'Global Settings')]"));
        await globalTab.click();
        
        // Find and toggle a setting
        const toggleSwitch = await driver.findElement(By.css('input[type="checkbox"]'));
        await toggleSwitch.click();
        
        // Wait for unsaved changes indicator
        await driver.wait(until.elementLocated(By.css('.unsaved-changes-alert')), 5000);
        
        // Click the Apply Changes button
        const saveButton = await driver.findElement(By.xpath("//button[contains(text(), 'Apply Changes')]"));
        await saveButton.click();
        
        // Verify success message appears
        await driver.wait(until.elementLocated(By.css('.save-success-message')), 5000);
        const successMessage = await driver.findElement(By.css('.save-success-message'));
        expect(await successMessage.isDisplayed()).to.be.true;
        expect(await successMessage.getText()).to.include('saved successfully');
        
        // Unsaved changes indicator should be gone
        try {
            await driver.wait(until.elementIsNotVisible(
                await driver.findElement(By.css('.unsaved-changes-alert'))
            ), 5000);
        } catch (error) {
            // Element might not exist at all, which is also fine
            const unsavedElements = await driver.findElements(By.css('.unsaved-changes-alert'));
            expect(unsavedElements.length).to.equal(0);
        }
    });
});