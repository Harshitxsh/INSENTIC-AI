"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Enable session persistence
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!pathname) {
        return;
      }

      const cleanPathname = pathname.replace(/\/$/, "");
      const isAuthRoute = cleanPathname === "/login" || cleanPathname === "/signup" || cleanPathname === "/forgot-password";
      
      if (!currentUser && !isAuthRoute) {
        // Redirect to login if not authenticated
        router.push("/login");
      } else if (currentUser && isAuthRoute) {
        // If authenticated and on auth route, redirect to command center
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // During SSR / static generation, render children normally to compile full static HTML
  if (!mounted) {
    return <>{children}</>;
  }

  const cleanPathname = pathname ? pathname.replace(/\/$/, "") : "";
  const isAuthRoute = cleanPathname === "/login" || cleanPathname === "/signup" || cleanPathname === "/forgot-password";

  // Show a loading screen on protected routes while checking authentication
  if (loading && !isAuthRoute) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-zinc-400">Authenticating corporate session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
