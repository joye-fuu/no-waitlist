const admin = require('firebase-admin');
const fs = require('fs');

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase connection...');
  
  try {
    // Check if service account file exists
    if (!fs.existsSync('./firebase-service-account.json')) {
      console.error('❌ Firebase service account file not found');
      console.error('Expected: firebase-service-account.json');
      process.exit(1);
    }
    
    console.log('✅ Service account file found');
    
    // Initialize Firebase Admin
    const serviceAccount = require('./firebase-service-account.json');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'no-waitlist';
    
    console.log(`🎯 Connecting to Firebase project: ${projectId}`);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
    
    const db = admin.firestore();
    
    // Test Firestore connection by trying to read from a test collection
    console.log('🧪 Testing Firestore access...');
    
    // Try to access the classes collection (this will be created by the scraper)
    const testQuery = await db.collection('classes').limit(1).get();
    console.log('✅ Firestore connection successful');
    console.log(`📊 Classes collection has ${testQuery.size} documents (expected if this is first run: 0)`);
    
    // Test write permissions by creating a test document
    console.log('✏️  Testing write permissions...');
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      timestamp: admin.firestore.Timestamp.now(),
      message: 'GitHub Actions Firebase connection test',
      scraper: 'comp-t3-2025'
    });
    
    console.log('✅ Write permissions successful');
    
    // Clean up test document
    await testRef.delete();
    console.log('🧹 Test document cleaned up');
    
    console.log('🎉 Firebase connection test PASSED');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Firebase connection test FAILED');
    console.error('Error details:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('💡 This likely means the service account lacks Firestore permissions');
      console.error('💡 Go to Firebase Console → IAM & Admin → Add Firestore permissions');
    } else if (error.code === 'not-found') {
      console.error('💡 Project not found - check FIREBASE_PROJECT_ID environment variable');
    } else {
      console.error('💡 Check that the service account JSON is valid and has the correct permissions');
    }
    
    process.exit(1);
  }
}

testFirebaseConnection();
