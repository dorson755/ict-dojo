import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    let credential: ServiceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      // Production: decode the base64-encoded service account JSON
      // This avoids multi-line env var issues in AWS Amplify
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf-8');
      credential = JSON.parse(decoded) as ServiceAccount;
    } else {
      // Local dev fallback: use individual env vars from .env.local
      credential = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      } as ServiceAccount;
    }

    initializeApp({ credential: cert(credential) });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
