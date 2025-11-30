const { google } = require('googleapis');
const readline = require('readline');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in backend/.env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'https://developers.google.com/oauthplayground' // Redirect URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Critical for getting refresh token
  scope: SCOPES,
});

console.log('\n=== Google Drive Authorization ===\n');
console.log('1. Open this URL in your browser:');
console.log(`\n${url}\n`);
console.log('2. Login with your Google account.');
console.log('3. Allow access.');
console.log('4. You will be redirected to OAuth Playground.');
console.log('5. Copy the "Authorization code" from the box on the left.');
console.log('6. Paste the code below:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the Authorization Code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n=== SUCCESS! ===\n');
    console.log('Add this to your backend/.env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    
    if (!tokens.refresh_token) {
        console.log('WARNING: No refresh token returned. Did you already authorize this app?');
        console.log('Go to https://myaccount.google.com/permissions and remove access for this app, then try again.');
    }

  } catch (error) {
    console.error('\nError retrieving access token:', error.message);
  } finally {
    rl.close();
  }
});
