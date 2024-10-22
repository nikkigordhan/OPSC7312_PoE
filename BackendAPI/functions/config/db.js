const admin = require('firebase-admin');
const serviceAccount = require('../Keys/serviceKey.json');


// Check if Firebase has already been initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://opsc7312database-default-rtdb.firebaseio.com/'
    });
    console.log('Firebase Admin SDK initialized successfully.');
} else {
    console.log('Firebase Admin SDK was already initialized.');
}

// Export the admin instance
module.exports = admin;
