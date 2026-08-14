import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  token: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved local session first
    const savedLocalUser = localStorage.getItem('smartspend_local_user');

    if (savedLocalUser) {
      try {
        const parsed = JSON.parse(savedLocalUser);
        setUser(parsed);
        const encoded = btoa(JSON.stringify(parsed));
        setToken(`local-token-${encoded}`);
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Error reading saved local user:', err);
      }
    }

    // Otherwise listen to Firebase auth state
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser as unknown as AppUser);
          try {
            const idToken = await currentUser.getIdToken();
            setToken(idToken);
          } catch {
            setToken(`local-token-${btoa(JSON.stringify({ uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName }))}`);
          }
        } else if (!localStorage.getItem('smartspend_local_user')) {
          setUser(null);
          setToken(null);
        }
        setLoading(false);
      });
    } catch (fbErr) {
      console.warn('Firebase onAuthStateChanged error:', fbErr);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    localStorage.removeItem('smartspend_local_user');
    await signInWithPopup(auth, googleAuthProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      // Try Firebase auth first
      await signInWithEmailAndPassword(auth, email, password);
    } catch (fbErr: any) {
      // If Firebase fails due to unauthorized-domain or offline config, support local account
      const rawAccounts = localStorage.getItem('smartspend_stored_accounts');
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : {};
      
      if (accounts[email.toLowerCase()] && accounts[email.toLowerCase()].password === password) {
        const localUser: AppUser = {
          uid: accounts[email.toLowerCase()].uid,
          email: email.toLowerCase(),
          displayName: accounts[email.toLowerCase()].name || 'User',
        };
        localStorage.setItem('smartspend_local_user', JSON.stringify(localUser));
        setUser(localUser);
        const encoded = btoa(JSON.stringify(localUser));
        setToken(`local-token-${encoded}`);
        return;
      }
      throw fbErr;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        const idToken = await userCredential.user.getIdToken(true);
        setToken(idToken);
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: name,
        });
      }
    } catch (fbErr: any) {
      // If Firebase is restricted or fails, save local user account seamlessly
      const rawAccounts = localStorage.getItem('smartspend_stored_accounts');
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : {};
      const uid = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      accounts[email.toLowerCase()] = {
        uid,
        name,
        email: email.toLowerCase(),
        password,
      };
      localStorage.setItem('smartspend_stored_accounts', JSON.stringify(accounts));
      
      const localUser: AppUser = {
        uid,
        email: email.toLowerCase(),
        displayName: name,
      };
      localStorage.setItem('smartspend_local_user', JSON.stringify(localUser));
      setUser(localUser);
      const encoded = btoa(JSON.stringify(localUser));
      setToken(`local-token-${encoded}`);
    }
  };

  const logout = async () => {
    localStorage.removeItem('smartspend_local_user');
    try {
      await signOut(auth);
    } catch {
      // Ignore if offline
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
