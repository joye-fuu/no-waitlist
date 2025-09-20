const admin = require('firebase-admin');
const fs = require('fs');

console.log('🔍 Starting Firebase connection test...');

// Check environment variables
console.log('Environment check:');
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'NOT SET');
console.log('- TEST_RUN:', process.env.TEST_RUN || 'NOT SET');

// Check if service account file exists
const serviceAccountExists = fs.existsSync('./firebase-service-account.json');
console.log('- Service account file exists:', serviceAccountExists);

if (!serviceAccountExists) {
  console.error('❌ Firebase service account file not found');
  process.exit(1);
}

try {
  // Try to read and parse the service account
  const serviceAccountContent = fs.readFileSync('./firebase-service-account.json', 'utf8');
  console.log('✅ Service account file readable');
  
  const serviceAccount = JSON.parse(serviceAccountContent);
  console.log('✅ Service account JSON valid');
  console.log('- Project ID from file:', serviceAccount.project_id);
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
  console.log('✅ Firebase Admin initialized');
  
  // Test Firestore connection
  const db = admin.firestore();
  console.log('✅ Firestore client created');
  
  // Try to write a test document
  const testDoc = db.collection('test').doc('connection-test');
  await testDoc.set({
    message: 'Connection test successful',
    timestamp: admin.firestore.Timestamp.now()
  });
  console.log('✅ Test write to Firestore successful');
  
  // Clean up test document
  await testDoc.delete();
  console.log('✅ Test cleanup successful');
  
  console.log('🎉 All Firebase tests passed!');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Firebase test failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
