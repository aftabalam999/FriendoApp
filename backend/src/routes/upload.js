const express = require('express');
const router = express.Router();
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!clientId || !clientSecret || !refreshToken || !folderId) {
            return res.status(500).json({ 
                message: 'Google Drive configuration missing. Check .env for CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, and FOLDER_ID.' 
            });
        }

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const fileMetadata = {
            name: `${Date.now()}_${req.file.originalname}`,
            parents: [folderId],
        };

        const media = {
            mimeType: req.file.mimetype,
            body: bufferStream,
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make the file public so it can be viewed in the chat
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Construct a direct link for <img> tags
        // Using lh3.googleusercontent.com is often more reliable for embedding than drive.google.com/uc
        const directLink = `https://lh3.googleusercontent.com/d/${file.data.id}`;

        res.json({ 
            url: directLink, 
            name: req.file.originalname, 
            type: req.file.mimetype,
            driveId: file.data.id
        });

    } catch (error) {
        console.error('Drive Upload Error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

module.exports = router;
