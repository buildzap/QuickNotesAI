// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyDGrG-OgM_oWafLtdJRW1vpcaGLQHjZWrc",
    authDomain: "quicknoteai-77.firebaseapp.com",
    projectId: "quicknoteai-77",
    storageBucket: "quicknoteai-77.firebasestorage.app",
    messagingSenderId: "130886081901",
    appId: "1:130886081901:web:a84d3e0f9d275db24d8e64"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/icon.png',
        badge: '/badge.png',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
