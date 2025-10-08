export const environment = {
  production: true,
   //apiBaseUrl:'https://localhost:7156/api'
      apiBaseUrl: 'https://192.168.51.130/api',
   // apiBaseUrl: 'http://compassint.ddns.net:2041/api',
  // apiBaseUrl: 'https://Api.Ajmanccc.ae/api',

  firebase: {
    apiKey: "AIzaSyAB3FKe70tGitiH23qLJY7jU_gLAxzjWhc",
    authDomain: "ccc-serevices.firebaseapp.com",
    projectId: "ccc-serevices",
    storageBucket: "ccc-serevices.firebasestorage.app",
    messagingSenderId: "925368974020",
    appId: "1:925368974020:web:466fb76f93fec73d76a791",
    measurementId: "G-NK49CFN1YH",
    // TODO: Add VAPID key from Firebase Console
    // vapidKey: "YOUR_VAPID_KEY_HERE"
    vapidKey: undefined as string | undefined
  }
};
