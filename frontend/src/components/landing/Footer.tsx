"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-[#FAF9F6] border-t-3 border-black py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans text-black">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-purple-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                <Brain className="h-4.5 w-4.5 text-black" />
              </div>
              <span className="text-xl font-black uppercase text-black">Atlas</span>
            </Link>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed max-w-sm">
              The continuous intelligence layer that synthesizes scattered company folders, chats, and wikis into an active, secure Company Brain.
            </p>
            {/* Newsletter */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest mb-3">
                Subscribe to our newsletter
              </h4>
              {subscribed ? (
                <div className="p-3 rounded-lg bg-emerald-100 border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_#000000]">
                  Thank you! You are subscribed.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex max-w-sm shadow-[3px_3px_0px_#000000] border-2 border-black rounded-xl overflow-hidden bg-white">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="flex-1 px-4 py-2.5 text-xs text-black bg-white focus:outline-none placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-purple-300 hover:bg-purple-400 border-l-2 border-black text-black font-black transition-all flex items-center justify-center cursor-pointer"
                  >
                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5px]" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-4 border-b border-black pb-1 inline-block">Product</h4>
            <ul className="space-y-2 text-xs font-extrabold text-slate-800">
              <li><Link href="#features" className="hover:text-purple-650 transition-colors uppercase">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-purple-650 transition-colors uppercase">Pipeline</Link></li>
              <li><Link href="#pricing" className="hover:text-purple-650 transition-colors uppercase">Pricing</Link></li>
              <li><Link href="/login" className="hover:text-purple-650 transition-colors uppercase">Workspace</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-4 border-b border-black pb-1 inline-block">Resources</h4>
            <ul className="space-y-2 text-xs font-extrabold text-slate-800">
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Documentation</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">API Status</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Security Audit</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Changelog</a></li>
            </ul>
          </div>

          {/* Links Col 3 */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-4 border-b border-black pb-1 inline-block">Legal</h4>
            <ul className="space-y-2 text-xs font-extrabold text-slate-800">
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Terms of Service</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Security Center</a></li>
              <li><a href="#" className="hover:text-purple-650 transition-colors uppercase">Trust Report</a></li>
            </ul>
          </div>
        </div>

        <hr className="border-black border mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-extrabold text-slate-650 uppercase">
          <span>&copy; {new Date().getFullYear()} Project Atlas. All rights reserved.</span>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-purple-650 underline decoration-2 decoration-purple-300">Twitter</a>
            <a href="#" className="hover:text-purple-650 underline decoration-2 decoration-purple-300">GitHub</a>
            <a href="#" className="hover:text-purple-650 underline decoration-2 decoration-purple-300">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
