import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAF-bjLBXAWicPNRZ1Lj77i7xmpu7UXiKA",
    authDomain: "dividas-23d3d.firebaseapp.com",
    projectId: "dividas-23d3d",
    storageBucket: "dividas-23d3d.firebasestorage.app",
    messagingSenderId: "1066385206613",
    appId: "1:1066385206613:web:0661cf2551738db750d3dc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
