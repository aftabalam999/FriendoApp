const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

try {
  let serviceAccount;
  
  if (process.env.FIREBASE_ADMIN_SDK_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  } else {
    // Try loading from file
    try {
        serviceAccount = require('../../service-account.json');
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
    console.log(`Firebase Admin Initialized with Service Account. Bucket: ${bucketName}`);
  } else {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
    console.log('Firebase Admin Initialized with Default Credentials');
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

const db = admin.firestore();
const auth = admin.auth(); // Not used for client auth, but maybe for user management if needed
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
