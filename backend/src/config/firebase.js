const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

try {
  let serviceAccount;
  
  // 1. Try JSON string from env vars
  const jsonCreds = process.env.FIREBASE_ADMIN_SDK_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (jsonCreds) {
    try {
      serviceAccount = JSON.parse(jsonCreds);
    } catch (e) {
      console.error('Failed to parse FIREBASE_ADMIN_SDK_JSON/FIREBASE_SERVICE_ACCOUNT:', e);
    }
  } 
  
  // 2. Try individual env vars
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Handle escaped newlines
    };
  }

  // 3. Try loading from file (local dev)
  if (!serviceAccount) {
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
    // 4. Fallback to default credentials (GCP environment)
    console.log('Attempting to use Application Default Credentials...');
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
    console.log('Firebase Admin Initialized with Default Credentials');
  }
} catch (error) {
  console.error('CRITICAL: Firebase Admin Initialization Error:', error);
  process.exit(1); // Exit process if critical dependency fails
}

const db = admin.firestore();
const auth = admin.auth(); // Not used for client auth, but maybe for user management if needed
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
