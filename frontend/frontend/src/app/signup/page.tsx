"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupWithEmail, signInWithGoogle, onAuthStateChange } from "@/lib/firebase";
import { Brain, User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Field errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const validateForm = () => {
    let isValid = true;

    // Name validation
    if (!name.trim()) {
      setNameError("Full name is required.");
      isValid = false;
    } else {
      setNameError("");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email address is required.");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Password validation
    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    } else {
      setPasswordError("");
    }

    // Confirm password validation
    if (!confirmPassword) {
      setConfirmError("Please confirm your password.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      isValid = false;
    } else {
      setConfirmError("");
    }

    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signupWithEmail(email, password, name);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("email-already-in-use")) {
        setError("This email address is already registered.");
      } else {
        setError(errorMessage || "An error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-black">
      
      {/* Decorative shapes */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-purple-200 border-2 border-black rounded-3xl rotate-45 shadow-[4px_4px_0px_#000000] pointer-events-none hidden lg:block opacity-50" />
      <div className="absolute bottom-10 left-1/4 w-28 h-28 bg-yellow-200 border-2 border-black rounded-full shadow-[4px_4px_0px_#000000] pointer-events-none hidden lg:block opacity-50" />

      {/* Header logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center space-x-2.5 mb-6 group">
          <div className="h-10 w-10 rounded-xl bg-purple-350 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_#000000] transition-all">
            <Brain className="h-5.5 w-5.5 text-black" />
          </div>
          <span className="text-2xl font-black uppercase text-black">Atlas</span>
        </Link>
        <h2 className="text-2xl font-black tracking-tight uppercase">
          Create Atlas Account
        </h2>
        <p className="mt-2 text-xs font-bold text-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="underline font-black text-purple-650 hover:text-purple-700">
            Sign in here
          </Link>
        </p>
      </div>

      {/* Main card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 border-3 border-black shadow-[6px_6px_0px_#000000] rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-100 border-2 border-black text-black text-xs font-bold leading-relaxed shadow-[2px_2px_0px_#000000]">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignup}>
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-black stroke-[2.5px]" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="Alex Carter"
                  className={`block w-full pl-11 pr-3 py-2.5 bg-white border-2 ${
                    nameError ? "border-rose-500" : "border-black focus:bg-purple-50"
                  } rounded-xl text-sm font-semibold text-black placeholder-slate-500 focus:outline-none transition-colors`}
                />
              </div>
              {nameError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{nameError}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-black stroke-[2.5px]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="name@company.com"
                  className={`block w-full pl-11 pr-3 py-2.5 bg-white border-2 ${
                    emailError ? "border-rose-500" : "border-black focus:bg-purple-50"
                  } rounded-xl text-sm font-semibold text-black placeholder-slate-500 focus:outline-none transition-colors`}
                />
              </div>
              {emailError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{emailError}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-black stroke-[2.5px]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-11 pr-10 py-2.5 bg-white border-2 ${
                    passwordError ? "border-rose-500" : "border-black focus:bg-purple-50"
                  } rounded-xl text-sm font-semibold text-black placeholder-slate-500 focus:outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-black cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5 text-black stroke-[2px]" /> : <Eye className="h-4.5 w-4.5 text-black stroke-[2px]" />}
                </button>
              </div>
              {passwordError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{passwordError}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-black stroke-[2.5px]" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError("");
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-11 pr-10 py-2.5 bg-white border-2 ${
                    confirmError ? "border-rose-500" : "border-black focus:bg-purple-50"
                  } rounded-xl text-sm font-semibold text-black placeholder-slate-500 focus:outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-black cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5 text-black stroke-[2px]" /> : <Eye className="h-4.5 w-4.5 text-black stroke-[2px]" />}
                </button>
              </div>
              {confirmError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{confirmError}</p>}
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center space-x-2 py-3.5 px-4 border-2 border-black rounded-xl bg-purple-300 hover:bg-purple-400 text-sm font-black text-black shadow-[4px_4px_0px_#000000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000] transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4.5 h-4.5 text-black stroke-[3px]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-black" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3 bg-white text-slate-555 font-black tracking-wider">Or register with</span>
              </div>
            </div>

            {/* Google Signup Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-sm font-black text-black shadow-[4px_4px_0px_#000000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000] transition-all disabled:opacity-50 cursor-pointer uppercase"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Google Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
