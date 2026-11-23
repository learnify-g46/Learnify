
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "learnify-35b0f.firebaseapp.com",
  projectId: "learnify-35b0f",
  storageBucket: "learnify-35b0f.firebasestorage.app",
  messagingSenderId: "1029424435586",
  appId: "1:1029424435586:web:cbac6c249c9df6a26dbf9b",
  measurementId: "G-S528NSJC6X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };


// // import {getAuth, GoogleAuthProvider} from "firebase/auth"
// // import { initializeApp } from "firebase/app";
// // const firebaseConfig = {
// //   apiKey: import.meta.env.VITE_FIREBASE_APIKEY ,
// //   authDomain: "loginlms-a7ea1.firebaseapp.com",
// //   projectId: "loginlms-a7ea1",
// //   storageBucket: "loginlms-a7ea1.firebasestorage.app",
// //   messagingSenderId: "665916718747",
// //   appId: "1:665916718747:web:16dbe0bfe5aeeface0903e"
// // };

// // // Initialize Firebase
// // const app = initializeApp(firebaseConfig);
// // const auth = getAuth(app)
// // const provider = new GoogleAuthProvider()
// // export {auth,provider}



// import {getAuth, GoogleAuthProvider} from "firebase/auth"
// import { initializeApp } from "firebase/app";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
//   authDomain: "mainlms-78eba.firebaseapp.com",
//   projectId: "mainlms-78eba",
//   storageBucket: "mainlms-78eba.firebasestorage.app",
//   messagingSenderId: "695765886523",
//   appId: "1:695765886523:web:c3956536239b7ad2401e1e"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
//  const auth = getAuth(app)
// const provider = new GoogleAuthProvider()
// export {auth,provider}
