import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  Auth
} from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForProjectAtlasInit",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "time-table-647a9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "time-table-647a9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "time-table-647a9.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

/**
 * Retrieve active user's Firebase JWT ID Token for API authentication headers.
 */
export const getFirebaseIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  if (typeof window !== "undefined" && auth?.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.error("Failed to retrieve Firebase ID token:", err);
      return null;
    }
  }
  return null;
};

export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const u = userCredential.user;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
};

export const signupWithEmail = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const u = userCredential.user;
  await updateProfile(u, { displayName });
  return {
    uid: u.uid,
    email: u.email,
    displayName: displayName,
    photoURL: u.photoURL,
  };
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const u = userCredential.user;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const updateUserProfile = async (displayName: string, photoURL: string, phoneNumber?: string): Promise<UserProfile> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user session.");
  await updateProfile(currentUser, { displayName, photoURL });
  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
    phoneNumber: phoneNumber || null
  };
};

export const onAuthStateChange = (callback: (user: UserProfile | null) => void): (() => void) => {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || 'User'}`,
        phoneNumber: user.phoneNumber || null
      });
    } else {
      callback(null);
    }
  });
};
