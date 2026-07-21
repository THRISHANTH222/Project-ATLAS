"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChange, logout, UserProfile } from "@/lib/firebase";
import { Brain, Menu, X, ArrowRight, User } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b-3 border-black bg-[#FAF9F6] ${
        scrolled ? "py-3 shadow-[0_4px_0px_rgba(0,0,0,1)]" : "py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-purple-350 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_#000000] transition-all">
              <Brain className="h-5.5 w-5.5 text-black" />
            </div>
            <span className="text-2xl font-black text-black tracking-tight uppercase">
              Atlas
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-sm font-extrabold text-black hover:text-purple-650 transition-colors uppercase tracking-wider"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-extrabold text-black hover:text-purple-650 transition-colors uppercase tracking-wider"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-extrabold text-black hover:text-purple-650 transition-colors uppercase tracking-wider"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-extrabold text-black hover:text-purple-650 transition-colors uppercase tracking-wider"
            >
              FAQ
            </Link>
          </div>

          {/* Auth CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-sm font-extrabold text-black hover:text-purple-650 transition-colors mr-2 uppercase tracking-wide"
                >
                  <User className="w-4.5 h-4.5 text-black" />
                  <span>{user.displayName || "Dashboard"}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="px-4.5 py-2.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-xs font-black text-black shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000000] transition-all cursor-pointer uppercase"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-extrabold text-black hover:text-purple-650 px-4 py-2 transition-colors uppercase"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-purple-300 hover:bg-purple-400 border-2 border-black shadow-[3px_3px_0px_#000000] text-black text-xs font-black uppercase hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 text-black stroke-[3px]" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-black border-2 border-black bg-white shadow-[2px_2px_0px_#000000] focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 stroke-[2.5px]" />
              ) : (
                <Menu className="h-5 w-5 stroke-[2.5px]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF9F6] border-t-2 border-black px-4 pt-4 pb-6 space-y-4 shadow-[0_4px_0px_rgba(0,0,0,1)]">
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-extrabold text-black hover:bg-purple-200 border-2 border-transparent hover:border-black transition-all"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-extrabold text-black hover:bg-purple-200 border-2 border-transparent hover:border-black transition-all"
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-extrabold text-black hover:bg-purple-200 border-2 border-transparent hover:border-black transition-all"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-base font-extrabold text-black hover:bg-purple-200 border-2 border-transparent hover:border-black transition-all"
          >
            FAQ
          </Link>
          
          <hr className="border-black border" />
          
          <div className="flex flex-col space-y-3 px-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-base font-extrabold text-black hover:text-purple-650 transition-colors"
                >
                  <User className="w-5 h-5 text-black" />
                  <span>{user.displayName || "Dashboard"}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center px-4.5 py-3 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-sm font-black text-black shadow-[2px_2px_0px_#000000] cursor-pointer uppercase"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-base font-extrabold text-black hover:text-purple-650 transition-colors uppercase"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-purple-300 border-2 border-black text-black text-sm font-black shadow-[3px_3px_0px_#000000] cursor-pointer uppercase"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-5 w-5 text-black stroke-[3px]" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
