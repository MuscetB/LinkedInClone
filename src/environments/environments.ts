import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";

export const environment = {
    production: false,
    firebaseConfig: {
      apiKey: "AIzaSyAupoqwxZ8MfLRs6cBPw99m7IKzAi3Z6Pg",
      authDomain: "linkedinklonv1.firebaseapp.com",
      databaseURL: "https://linkedinklonv1-default-rtdb.firebaseio.com",
      projectId: "linkedinklonv1",
      storageBucket: "linkedinklonv1.appspot.com",
      messagingSenderId: "428100516891",
      appId: "1:428100516891:web:c7acfbf7ccf10bc6d70cbe",
      measurementId: "G-P152GEPKKC"
    },
  };
  const app = initializeApp(environment.firebaseConfig);
const analytics = getAnalytics(app);
  