const { Builder } = require('selenium-webdriver');
const path = require('path');
const fs = require('fs');
const { By,until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const { createFirefoxTestProfile } = require('./setup');

async function createDriver() {
  const profile = await createFirefoxTestProfile();

  // copy file user-working.js inside firefox-profile folder
  const sourcePath = path.join(__dirname, 'user-working.js');
  const destPath = path.join(__dirname, 'firefox-profile', 'user.js');

  // copy the file to the destination
  fs.copyFileSync(sourcePath, destPath);
  
  const options = new firefox.Options()
    .setProfile(path.join(__dirname, 'firefox-profile'))
    .setPreference('browser.startup.homepage', 'about:blank')
    .setBinary("C:\\Program Files\\Firefox Developer Edition\\firefox.exe")
    .setPreference('browser.startup.page', 0);
  
  return new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();
}

module.exports = { createDriver };