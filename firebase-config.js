/* ==========================================================================
   MALODAC VENTURES — firebase-config.js
   Connects the website to your Firebase project. Loaded AFTER the Firebase
   scripts and BEFORE script.js / admin.js on the pages that use Firebase.

   1. Paste YOUR values into firebaseConfig below (see SETUP-GUIDE.md, step 2).
      These values are safe to be public; your data is protected by the
      rules in firestore.rules, not by hiding this config.
   ========================================================================== */

const firebaseConfig = {
    apiKey: 'AIzaSyBmj68KtKjcnIJK2C6Cc6jKkPI91aGIRos',
    authDomain: 'malodac-ventures.firebaseapp.com',
    projectId: 'malodac-ventures',
    storageBucket: 'malodac-ventures.firebasestorage.app',
    messagingSenderId: '1466897742',
    appId: '1:1466897742:web:14b63969d7c921d4487a1f',
    measurementId: "G-XJSZ34QQTY"
};

/* Product categories. The admin dashboard's "Category" dropdown and the
   filter buttons on products.html are both built from this list, so to add a
   new category you only need to add one line here.
   key   = short code saved with each product (lowercase, no spaces)
   label = the name customers see                                           */
window.MALODAC_CATEGORIES = [
    { key: 'chafing', label: 'Chafing dishes' },
    { key: 'dinnerware', label: 'Dinnerware' },
    { key: 'serving', label: 'Serving pieces' },
    { key: 'dispensers', label: 'Dispensers' },
    { key: 'coolers', label: 'Coolers' },
    { key: 'icingbucket', label: 'Icing Bucket' },
    { key: 'cuttleries', label: 'Cuttleries' },
    { key: 'unbreakable', label: 'Unbreakable' }
];

/* ---- Nothing below needs editing ---------------------------------------- */
window.malodacConfigured = !firebaseConfig.apiKey.startsWith('PASTE');

if (window.malodacConfigured && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.malodacDb = firebase.firestore();
    // Only the admin page loads the Auth library; shop pages don't need it
    if (typeof firebase.auth === 'function') window.malodacAuth = firebase.auth();
}
