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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if firebase is fully configured
const isFirebaseConfigured = 
  typeof window !== "undefined" && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "placeholder-key" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "";

let app;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to Mock Auth:", error);
  }
}

// In-Memory & LocalStorage Mock Auth State for fallback
const MOCK_USER_KEY = "atlas_mock_user";

const getMockUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(MOCK_USER_KEY);
  return user ? JSON.parse(user) : null;
};

const setMockUser = (user: UserProfile | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(MOCK_USER_KEY);
  }
};

const listeners = new Set<(user: UserProfile | null) => void>();

const notifyListeners = (user: UserProfile | null) => {
  listeners.forEach((callback) => callback(user));
};

// Listen to localstorage changes for multi-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === MOCK_USER_KEY) {
      const user = e.newValue ? JSON.parse(e.newValue) : null;
      notifyListeners(user);
    }
  });
}

// Simulate Network Latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isMockAuth = !auth;

export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  await delay(800); // Simulate network lag
  
  if (!isMockAuth) {
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const u = userCredential.user;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
    };
  } else {
    // Mock authentication logic
    const mockUsersRaw = localStorage.getItem("atlas_mock_users_db") || "[]";
    const mockUsers = JSON.parse(mockUsersRaw);
    const user = mockUsers.find((u: { email: string; password?: string; displayName?: string; uid?: string }) => u.email === email);
    
    if (!user) {
      throw new Error("auth/user-not-found: No user found with this email.");
    }
    if (user.password !== password) {
      throw new Error("auth/wrong-password: The password you entered is incorrect.");
    }
    
    const loggedInUser: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.displayName}`,
    };
    
    setMockUser(loggedInUser);
    notifyListeners(loggedInUser);
    return loggedInUser;
  }
};

export const signupWithEmail = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
  await delay(800); // Simulate network lag
  
  if (!isMockAuth) {
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const u = userCredential.user;
    await updateProfile(u, { displayName });
    return {
      uid: u.uid,
      email: u.email,
      displayName: displayName,
      photoURL: u.photoURL,
    };
  } else {
    // Mock signup logic
    const mockUsersRaw = localStorage.getItem("atlas_mock_users_db") || "[]";
    const mockUsers = JSON.parse(mockUsersRaw);
    
    if (mockUsers.some((u: { email: string }) => u.email === email)) {
      throw new Error("auth/email-already-in-use: An account already exists with this email.");
    }
    
    const newUser = {
      uid: "mock_" + Math.random().toString(36).substr(2, 9),
      email,
      password,
      displayName,
    };
    
    mockUsers.push(newUser);
    localStorage.setItem("atlas_mock_users_db", JSON.stringify(mockUsers));
    
    const loggedInUser: UserProfile = {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${newUser.displayName}`,
    };
    
    setMockUser(loggedInUser);
    notifyListeners(loggedInUser);
    return loggedInUser;
  }
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  await delay(600); // Simulate network lag
  
  if (!isMockAuth) {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth!, provider);
    const u = userCredential.user;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
    };
  } else {
    // Mock google login
    const googleUser: UserProfile = {
      uid: "mock_google_" + Math.random().toString(36).substr(2, 9),
      email: "google.user@example.com",
      displayName: "Alex Carter",
      photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    };
    
    setMockUser(googleUser);
    notifyListeners(googleUser);
    return googleUser;
  }
};

export const logout = async (): Promise<void> => {
  await delay(400); // Simulate network lag
  
  if (!isMockAuth) {
    await signOut(auth!);
  } else {
    setMockUser(null);
    notifyListeners(null);
  }
};

export const updateUserProfile = async (displayName: string, photoURL: string, phoneNumber?: string): Promise<UserProfile> => {
  await delay(500); // Network latency simulation
  
  if (!isMockAuth) {
    const currentUser = auth!.currentUser;
    if (!currentUser) throw new Error("No authenticated user session.");
    await updateProfile(currentUser, { displayName, photoURL });
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      phoneNumber: phoneNumber || null
    };
  } else {
    const mockUser = getMockUser();
    if (!mockUser) throw new Error("No active mock session.");
    
    const updatedUser: UserProfile = {
      ...mockUser,
      displayName,
      photoURL,
      phoneNumber: phoneNumber || null
    };
    
    setMockUser(updatedUser);
    
    const mockUsersRaw = localStorage.getItem("atlas_mock_users_db") || "[]";
    const mockUsers = JSON.parse(mockUsersRaw);
    const userIndex = mockUsers.findIndex((u: { email: string }) => u.email === mockUser.email);
    if (userIndex > -1) {
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        displayName,
        photoURL,
        phoneNumber: phoneNumber || null
      };
      localStorage.setItem("atlas_mock_users_db", JSON.stringify(mockUsers));
    }
    
    notifyListeners(updatedUser);
    return updatedUser;
  }
};

export const onAuthStateChange = (callback: (user: UserProfile | null) => void): (() => void) => {
  if (!isMockAuth) {
    return onAuthStateChanged(auth!, (user: FirebaseUser | null) => {
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
  } else {
    // Initial check
    callback(getMockUser());
    
    // Subscribe
    listeners.add(callback);
    
    // Unsubscribe helper
    return () => {
      listeners.delete(callback);
    };
  }
};
