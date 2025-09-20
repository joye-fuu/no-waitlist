import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * Interface definitions for our data structures
 */
interface ClassData {
  courseCode: string;
  courseName: string;
  classID: number;
  section: string;
  term: string;
  activity: string;
  status: string;
  courseEnrolment: {
    enrolments: number;
    capacity: number;
  };
  termDates: {
    start: string;
    end: string;
  };
  mode: string;
  times: Array<{
    day: string;
    time: {
      start: string;
      end: string;
    };
    weeks: string;
    location: string;
  }>;
  notes?: string;
  lastUpdated: admin.firestore.Timestamp;
}

interface WaitlistEntry {
  userId: string;
  classId: number;
  courseCode: string;
  section: string;
  createdAt: admin.firestore.Timestamp;
  notified: boolean;
}

/**
 * Cloud Function to check waitlists and send notifications
 * This will be triggered by Firestore writes from the GitHub Actions scraper
 */
export const checkWaitlistNotifications = functions.firestore
  .document('classes/{classId}')
  .onWrite(async (change, context) => {
    const classId = context.params.classId;
    
    // Only process if this is an update (not a delete)
    if (!change.after.exists) {
      return null;
    }
    
    const newClassData = change.after.data() as ClassData;
    const oldClassData = change.before.exists ? change.before.data() as ClassData : null;
    
    // Check if availability increased (spots opened up)
    const hadAvailability = oldClassData ? 
      (oldClassData.courseEnrolment?.enrolments || 0) < (oldClassData.courseEnrolment?.capacity || 0) : 
      false;
    const hasAvailability = newClassData.courseEnrolment.enrolments < newClassData.courseEnrolment.capacity;
    
    // Only notify if availability changed from none to some
    if (!hadAvailability && hasAvailability) {
      await notifyWaitlistedUsers(classId, newClassData);
    }
    
    return null;
  });

/**
 * Send notifications to users waitlisting a specific class
 */
async function notifyWaitlistedUsers(classId: string, classData: ClassData): Promise<void> {
  try {
    // Find all users waitlisting this class
    const waitlistQuery = await db.collectionGroup('classes')
      .where('classId', '==', parseInt(classId))
      .where('notified', '==', false)
      .get();
    
    const notifications: Promise<void>[] = [];
    
    for (const waitlistDoc of waitlistQuery.docs) {
      const waitlistEntry = waitlistDoc.data() as WaitlistEntry;
      notifications.push(sendNotification(waitlistEntry, classData));
      
      // Mark as notified
      notifications.push(
        waitlistDoc.ref.update({ notified: true }).then(() => {})
      );
    }
    
    await Promise.all(notifications);
    console.log(`Sent ${waitlistQuery.size} notifications for class ${classId}`);
  } catch (error) {
    console.error('Error notifying waitlisted users:', error);
  }
}

/**
 * Send push notification to user
 */
async function sendNotification(waitlistEntry: WaitlistEntry, classData: ClassData): Promise<void> {
  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(waitlistEntry.userId).get();
    
    if (!userDoc.exists) {
      console.error(`User ${waitlistEntry.userId} not found`);
      return;
    }
    
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;
    
    if (!fcmToken) {
      console.error(`No FCM token for user ${waitlistEntry.userId}`);
      return;
    }
    
    // Send notification
    const message = {
      token: fcmToken,
      notification: {
        title: 'Class Available!',
        body: `${classData.courseCode} ${classData.section} now has ${classData.courseEnrolment.capacity - classData.courseEnrolment.enrolments} spots available!`
      },
      data: {
        classId: waitlistEntry.classId.toString(),
        courseCode: classData.courseCode,
        section: classData.section
      }
    };
    
    await admin.messaging().send(message);
    console.log(`Notification sent to user ${waitlistEntry.userId} for class ${waitlistEntry.classId}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * API endpoint to add a class to user's waitlist
 */
export const addToWaitlist = functions.https.onCall(async (data: any, context: any) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { classId, courseCode, section } = data;
  const userId = context.auth.uid;
  
  if (!classId || !courseCode || !section) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  try {
    // Add to user's waitlist
    await db.collection('waitlists').doc(userId).collection('classes').doc(classId.toString()).set({
      userId,
      classId,
      courseCode,
      section,
      createdAt: admin.firestore.Timestamp.now(),
      notified: false
    });
    
    return { success: true, message: 'Added to waitlist successfully' };
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    throw new functions.https.HttpsError('internal', 'Failed to add to waitlist');
  }
});

/**
 * API endpoint to remove a class from user's waitlist
 */
export const removeFromWaitlist = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { classId } = data;
  const userId = context.auth.uid;
  
  if (!classId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing classId');
  }
  
  try {
    await db.collection('waitlists').doc(userId).collection('classes').doc(classId.toString()).delete();
    return { success: true, message: 'Removed from waitlist successfully' };
  } catch (error) {
    console.error('Error removing from waitlist:', error);
    throw new functions.https.HttpsError('internal', 'Failed to remove from waitlist');
  }
});

/**
 * API endpoint to get user's waitlist
 */
export const getWaitlist = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    const waitlistSnapshot = await db.collection('waitlists').doc(userId).collection('classes').get();
    const waitlist = waitlistSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    return { waitlist };
  } catch (error) {
    console.error('Error getting waitlist:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get waitlist');
  }
});

/**
 * API endpoint to search classes
 */
export const searchClasses = functions.https.onCall(async (data: any) => {
  const { courseCode, term } = data;
  
  try {
    let query = db.collection('classes') as any;
    
    if (courseCode) {
      query = query.where('courseCode', '==', courseCode.toUpperCase());
    }
    
    if (term) {
      query = query.where('term', '==', term);
    }
    
    const snapshot = await query.limit(100).get();
    const classes = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    return { classes };
  } catch (error) {
    console.error('Error searching classes:', error);
    throw new functions.https.HttpsError('internal', 'Failed to search classes');
  }
});
