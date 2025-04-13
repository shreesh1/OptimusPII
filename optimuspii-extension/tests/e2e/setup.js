const FirefoxProfile = require('firefox-profile');
const path = require('path');
const fs = require('fs');

const profilePath = path.join(__dirname, 'firefox-profile');

async function createFirefoxTestProfile() {

  // // Build the extension first (ensure it's fresh)
  console.log('Building extension...');
  await buildExtension();

  // Clean up existing profile directory if it exists
  if (fs.existsSync(profilePath)) {
    console.log('Removing existing profile...');
    fs.rmSync(profilePath, { recursive: true, force: true });
  }

  return new Promise((resolve, reject) => {
    const myProfile = new FirefoxProfile({ destinationDirectory: path.join(__dirname, 'firefox-profile') });

    // Enable extension development mode
    myProfile.setPreference('xpinstall.signatures.required', false);
    myProfile.setPreference('devtools.debugger.remote-enabled', true);
    myProfile.setPreference('devtools.chrome.enabled', true);
    myProfile.setPreference(
      'extensions.webextensions.uuids',
      "{\"{ae50d192-ea57-4d28-a49a-46b39241df21}\":\"595108c3-fc1a-46bc-a6f6-918a6b1898aa\"}",
    )

    // Add the extension temporarily
    const extensionPath = path.resolve(__dirname, '../../build/optimuspii.xpi');
    myProfile.addExtension(extensionPath, () => {
      myProfile.encoded((err, encodedProfile) => {
        if (err) return reject(err);
        resolve(encodedProfile, profilePath);
      });
    });
  });
}

async function buildExtension() {
  try {

    const webExt = await import('web-ext');

    const sourceDir = path.resolve(__dirname, '../../build/firefox');
    const artifactsDir = path.resolve(__dirname, '../../build');

    console.log(`Building extension from ${sourceDir} to ${artifactsDir}`);

    const result = await webExt.cmd.build({
      sourceDir,
      artifactsDir,
      overwriteDest: true,
      filename: 'optimuspii.xpi'
    });

    console.log('Extension built successfully:', result.extensionPath);
    return result.extensionPath;
  } catch (error) {
    console.error('Failed to build extension:', error);
    throw error;
  }
}


module.exports = {
  createFirefoxTestProfile,
  buildExtension
};