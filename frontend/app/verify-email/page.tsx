"use client";

import { useState, useEffect } from "react";
import { sendEmailVerification, reload } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Polling to check if email is verified
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);
          router.push("/");
        }
      }
    }, 3000); // check every 3 seconds

    return () => clearInterval(interval);
  }, [router]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendEmailVerification(auth.currentUser);
      setMessage("Verification email resent. Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 py-12">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl text-center">
        <div className="flex flex-col items-center mb-6">
          <Mail className="w-12 h-12 text-cyan-400 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="text-zinc-400 text-sm mt-4">
            We sent a verification link to <br/>
            <span className="font-semibold text-zinc-200">{auth.currentUser?.email}</span>
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            Please click the link to activate your enterprise workspace.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-900/30 border border-green-800 text-green-200 text-sm flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 mr-2" />
            {message}
          </div>
        )}

        <div className="space-y-3 mt-8">
          <Button 
            onClick={handleResend}
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={loading}
          >
            {loading ? "Sending..." : "Resend Verification Email"}
          </Button>

          <Button 
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-zinc-400 hover:text-zinc-300"
          >
            Sign out and return to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
