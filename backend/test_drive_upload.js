const { google } = require('googleapis');
const stream = require('stream');
const dotenv = require('dotenv');

dotenv.config();

async function testUpload() {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!clientId || !clientSecret || !refreshToken || !folderId) {
            console.error('Error: Missing configuration in .env');
            console.log('CLIENT_ID:', clientId ? 'Set' : 'Missing');
            console.log('CLIENT_SECRET:', clientSecret ? 'Set' : 'Missing');
            console.log('REFRESH_TOKEN:', refreshToken ? 'Set' : 'Missing');
            console.log('FOLDER_ID:', folderId ? 'Set' : 'Missing');
            return;
        }

        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth });

        console.log(`Using Folder ID: ${folderId}`);

        const bufferStream = new stream.PassThrough();
        bufferStream.end('Hello Google Drive via OAuth!');

        const fileMetadata = {
            name: `test_oauth_upload_${Date.now()}.txt`,
            parents: [folderId],
        };

        const media = {
            mimeType: 'text/plain',
            body: bufferStream,
        };

        console.log('Attempting upload...');
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        console.log('Upload successful!');
        console.log('File ID:', file.data.id);
        console.log('WebView Link:', file.data.webViewLink);

        // Test permissions
        console.log('Setting public permission...');
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        console.log('Permission set to public.');
        
        // Cleanup
        console.log('Deleting test file...');
        await drive.files.delete({ fileId: file.data.id });
        console.log('Test file deleted.');

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testUpload();
