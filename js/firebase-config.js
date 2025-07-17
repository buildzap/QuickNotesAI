/**
 * Firebase configuration and initialization
 */

// Firebase configuration
window.firebaseConfig = {
    apiKey: "AIzaSyDGrG-OgM_oWafLtdJRW1vpcaGLQHjZWrc",
    authDomain: "quicknoteai-77.firebaseapp.com",
    projectId: "quicknoteai-77",
    storageBucket: "quicknoteai-77.firebasestorage.app",
    messagingSenderId: "130886081901",
    appId: "1:130886081901:web:a84d3e0f9d275db24d8e64",
    measurementId: "G-MEASUREMENT_ID"
};

// Initialize Firebase asynchronously and export the promise
window.firebaseInitialized = (async () => {
    try {
        console.log('[Firebase] Initializing...');

        // Initialize Firebase app if not already initialized
        let app;
        if (!firebase?.apps?.length) {
            if (!firebase) {
                throw new Error('Firebase SDK not loaded');
            }
            console.log('[Firebase] Creating new app instance');
            app = firebase.initializeApp(window.firebaseConfig);
        } else {
            console.log('[Firebase] Using existing app instance');
            app = firebase.app();
        }

        // Initialize services safely
        console.log('[Firebase] Initializing services...');
        let auth, db, analytics;
        
        try {
            auth = app.auth();
            window.firebaseAuth = auth;
        } catch (error) {
            console.error('[Firebase] Error initializing Auth:', error);
            throw new Error('Failed to initialize Firebase Auth');
        }

        try {
            db = app.firestore();
            window.firebaseDb = db;
        } catch (error) {
            console.error('[Firebase] Error initializing Firestore:', error);
            throw new Error('Failed to initialize Firestore');
        }

        try {
            analytics = app.analytics?.() || null;
            if (analytics) window.firebaseAnalytics = analytics;
        } catch (error) {
            console.warn('[Firebase] Analytics initialization failed:', error);
            // Don't throw for analytics failure
        }

        // Initialize Firebase Functions for Telegram integration
        let functions;
        try {
            functions = app.functions();
            window.firebaseFunctions = functions;
            console.log('[Firebase] Functions initialized for Telegram integration');
        } catch (error) {
            console.warn('[Firebase] Functions initialization failed:', error);
            // Don't throw for functions failure - Telegram integration will handle this gracefully
        }
        
        // Note: We're using Google Apps Script for Smart Digest to avoid Blaze plan requirement
        console.log('[Firebase] Using Google Apps Script for Smart Digest');
        
        // Wait for auth to be ready with timeout (increase timeout to 30s for slow connections)
        await Promise.race([
            new Promise(resolve => {
                const unsubscribe = auth.onAuthStateChanged(user => {
                    unsubscribe();
                    resolve();
                });
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth initialization timeout')), 30000)
            )
        ]);
        
        // Configure Firestore settings and enable persistence (only if not already started)
        try {
            if (!db._settingsFrozen && !db._persistenceKey) {
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                    merge: true
                });
                try {
                    await db.enablePersistence({ synchronizeTabs: true });
                    window.persistenceEnabled = true;
                    console.log('[Firebase] Firestore persistence enabled');
                } catch (err) {
                    if (err.code === 'failed-precondition') {
                        console.warn('[Firebase] Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('[Firebase] The current browser does not support persistence.');
                    } else {
                        console.warn('[Firebase] Firestore enablePersistence error:', err);
                    }
                }
                console.log('[Firebase] Firestore settings configured');
            } else {
                console.log('[Firebase] Firestore settings already frozen or persistence already set, skipping settings() and enablePersistence');
            }
        } catch (err) {
            console.warn('[Firebase] Firestore settings() or enablePersistence skipped or failed:', err);
        }

        // Store references globally
        window.firebaseApp = app;
        window.firebaseAuth = auth;
        window.firebaseDb = db;
        if (functions) window.firebaseFunctions = functions;
        if (analytics) window.firebaseAnalytics = analytics;
        
        console.log('[Firebase] Core initialization complete');
        return { app, auth, db, functions, analytics };
    } catch (error) {
        console.error('[Firebase] Initialization error:', error);
        throw error;
    }
})();
