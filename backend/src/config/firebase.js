const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, '../../credentials/serviceAccountKey.json');

const existingApp = admin.getApps()[0];

if (!existingApp) {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase service account not found at "${serviceAccountPath}". ` +
      'Set FIREBASE_SERVICE_ACCOUNT_PATH or add backend/credentials/serviceAccountKey.json.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Firebase service account at "${serviceAccountPath}" is not valid JSON.`,
      { cause: error }
    );
  }

  admin.initializeApp({
    credential: admin.cert(serviceAccount),
    ...(process.env.FIREBASE_STORAGE_BUCKET
      ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
      : {}),
  });
}

const firebaseApp = existingApp || admin.getApps()[0];
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

module.exports = { admin, auth, db, storage };
