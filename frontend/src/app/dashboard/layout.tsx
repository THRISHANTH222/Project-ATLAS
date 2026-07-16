"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChange, logout, UserProfile } from "@/lib/firebase";
import { 
  Brain, 
  Database, 
  MessageSquare, 
  LayoutDashboard,
  LogOut, 
  User, 
  Loader2,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("atlas_theme") as "light" | "dark";
      return savedTheme || "light";
    }
    return "light";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_theme", nextTheme);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-sans text-black">
        <Loader2 className="w-10 h-10 text-black animate-spin mb-4" />
        <span className="text-black text-xs tracking-wider uppercase font-black">Validating Workspace Token...</span>
      </div>
    );
  }

  const isLinkActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { name: "Company Brain", href: "/dashboard/brain", icon: <Database className="w-4.5 h-4.5" /> },
    { name: "AI Chat", href: "/dashboard/chat", icon: <MessageSquare className="w-4.5 h-4.5" /> },
    { name: "Settings", href: "/dashboard/settings", icon: <User className="w-4.5 h-4.5" /> },
  ];

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-150 ${
      theme === "dark" 
        ? "dark bg-[#18181A] text-white" 
        : "bg-[#FAF9F6] text-black"
    }`}>
      
      {/* 1. Sidebar Navigation (Desktop) */}
      <aside className="w-66 border-r-3 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 flex flex-col justify-between hidden md:flex shrink-0 z-20 transition-colors">
        <div>
          {/* Logo & Theme Toggle */}
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-9.5 w-9.5 rounded-xl bg-purple-300 border-2 border-black dark:border-white flex items-center justify-center shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_#000000] transition-all">
                <Brain className="h-5 w-5 text-black" />
              </div>
              <span className="text-lg font-black text-black dark:text-white tracking-tight uppercase">Atlas</span>
            </Link>
            
            <button
              onClick={toggleTheme}
              className="p-2 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_#000000] dark:hover:shadow-[1px_1px_0px_#FFFFFF] transition-all cursor-pointer"
              title="Toggle theme mode"
            >
              {theme === "light" ? (
                <Moon className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-white stroke-[2.5px]" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase block mb-1.5 pl-3">Workspace</span>
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all border-2 border-black dark:border-white uppercase tracking-wider ${
                    active
                      ? "bg-purple-300 dark:bg-purple-650 text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#242427] text-black/75 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-[#2E2E32] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#000000] dark:hover:shadow-[1.5px_1.5px_0px_#FFFFFF] shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]"
                  }`}
                >
                  <div className="text-black dark:text-white">
                    {item.icon}
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom of Sidebar */}
        <div className="pt-6 border-t-2 border-black dark:border-white">
          <div className="flex items-center space-x-3 mb-4 p-2 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
            <div className="h-9 w-9 rounded-full border border-black dark:border-white bg-white dark:bg-[#242427] overflow-hidden flex items-center justify-center text-xs font-bold text-black dark:text-white shrink-0 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-black dark:text-white" />
              )}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-black text-black dark:text-white truncate">{user?.displayName || "Profile User"}</span>
              <span className="block text-[9px] font-mono text-slate-550 dark:text-slate-400 truncate">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] rounded-xl text-xs text-black dark:text-white font-black transition-all cursor-pointer shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000000] dark:hover:shadow-[1px_1px_0px_#FFFFFF] uppercase tracking-wider"
          >
            <LogOut className="w-4.5 h-4.5 text-black dark:text-white stroke-[2px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <header className="md:hidden h-16 border-b-3 border-black dark:border-white px-6 flex items-center justify-between bg-white dark:bg-[#1C1C1E] z-40 relative">
        <Link href="/" className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-black dark:text-white" />
          <span className="text-base font-black text-black dark:text-white uppercase">Atlas</span>
        </Link>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 border-2 border-black dark:border-white bg-white dark:bg-[#242427] rounded-xl shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
          >
            {theme === "light" ? <Moon className="w-4 h-4 text-black" /> : <Sun className="w-4 h-4 text-white" />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-black dark:text-white border-2 border-black dark:border-white bg-white dark:bg-[#242427] shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-[#FAF9F6] dark:bg-[#18181A] border-b-3 border-black dark:border-white p-6 space-y-4 shadow-[0_4px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_rgba(255,255,255,1)]">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3.5 py-3.5 border-2 border-black dark:border-white rounded-xl text-xs font-black uppercase tracking-wider ${
                      active 
                        ? "bg-purple-300 dark:bg-purple-650 text-black dark:text-white shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF]" 
                        : "bg-white dark:bg-[#242427] text-black dark:text-white shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <hr className="border-black dark:border-white border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white dark:bg-[#242427] border-2 border-black dark:border-white">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#18181A] flex items-center justify-center text-xs text-black dark:text-white border border-black dark:border-white shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                  {user?.displayName ? user.displayName[0] : "A"}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-black dark:text-white">{user?.displayName}</span>
                  <span className="block text-[9px] font-mono text-slate-550 dark:text-slate-450">{user?.email}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="p-3 border-2 border-black dark:border-white rounded-lg bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] text-black dark:text-white"
              >
                <LogOut className="w-4.5 h-4.5 text-black dark:text-white" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Main Scrollable Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

    </div>
  );
}
