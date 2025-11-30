const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

try {
  let serviceAccount;
  
  if (process.env.FIREBASE_ADMIN_SDK_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  } else {
    try {
        serviceAccount = require('./service-account.json');
    } catch (e) {
        console.log('No service-account.json found');
    }
  }

  if (serviceAccount) {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName
    });
    console.log(`Firebase Admin Initialized. Bucket: ${bucketName}`);
    
    const bucket = admin.storage().bucket();
    const file = bucket.file('test_upload.txt');
    
    file.save('Hello World', {
        metadata: { contentType: 'text/plain' }
    }, (err) => {
        if (err) {
            console.error('Upload failed:', err);
        } else {
            console.log('Upload successful!');
            // Clean up
            file.delete().then(() => console.log('Test file deleted.')).catch(e => console.error('Delete failed', e));
        }
    });

  } else {
    console.log('No service account found, cannot test upload.');
  }
} catch (error) {
  console.error('Initialization Error:', error);
}
