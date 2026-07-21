"use client";

import { useState, useEffect } from "react";
import { onAuthStateChange, updateUserProfile, UserProfile } from "@/lib/firebase";
import { User, Phone, CheckCircle, AlertTriangle, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";

interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: CountryCode[] = [
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+1", name: "Canada", flag: "🇨🇦" }
];

const PRESETS = ["Alex", "Jordan", "Taylor", "Morgan", "Sam", "Charlie", "Atlas"];

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Inputs
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneInput, setPhoneInput] = useState("");
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Input errors
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || "");
        setPhotoURL(currentUser.photoURL || "");
        
        // Parse existing phone number if present
        if (currentUser.phoneNumber) {
          const matched = COUNTRIES.find((c) => currentUser.phoneNumber?.startsWith(c.code));
          if (matched) {
            setCountryCode(matched.code);
            setPhoneInput(currentUser.phoneNumber.replace(matched.code, "").trim());
          } else {
            setPhoneInput(currentUser.phoneNumber);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const selectPresetAvatar = (seed: string) => {
    setPhotoURL(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const validate = () => {
    let isValid = true;
    
    if (!displayName.trim()) {
      setNameError("Full name is required.");
      isValid = false;
    } else {
      setNameError("");
    }

    if (phoneInput.trim()) {
      const isNumeric = /^\d+$/.test(phoneInput.replace(/\s+/g, ""));
      if (!isNumeric) {
        setPhoneError("Phone number must contain digits only.");
        isValid = false;
      } else if (phoneInput.replace(/\s+/g, "").length < 6) {
        setPhoneError("Phone number is too short.");
        isValid = false;
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }

    return isValid;
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const fullPhone = phoneInput.trim() ? `${countryCode}${phoneInput.trim().replace(/\s+/g, "")}` : "";
      const updated = await updateUserProfile(displayName.trim(), photoURL.trim(), fullPhone);
      setUser(updated);
      setSuccess("Profile settings successfully updated and saved!");
      
      // Auto-clear success message
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-black dark:text-white">
      
      {/* Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] transition-colors">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-black dark:text-white">
            Workspace Settings
          </h1>
          <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
            Update your profile info, customize your avatar, and link your verification phone details.
          </p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-purple-300 dark:bg-purple-650 text-black dark:text-white border-2 border-black dark:border-white text-[9px] font-black uppercase shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
          Settings Portal
        </div>
      </header>

      {/* Container */}
      <div className="p-6 sm:p-8 space-y-8 max-w-4xl w-full mx-auto">
        
        {/* Alerts */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-black dark:border-white text-black dark:text-emerald-400 text-xs font-black shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 stroke-[2.5px]" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-100 dark:bg-rose-950/60 border-2 border-black dark:border-white text-black dark:text-rose-400 text-xs font-black shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[2.5px]" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard profile grid card */}
        <div className="bg-white dark:bg-[#1C1C1E] border-3 border-black dark:border-white rounded-2xl shadow-[6px_6px_0px_#000000] dark:shadow-[6px_6px_0px_#FFFFFF] overflow-hidden transition-all">
          <div className="p-6 border-b-2 border-black dark:border-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">Profile Details</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{user?.email}</span>
          </div>

          <form onSubmit={handleSaveChanges} className="p-6 sm:p-8 space-y-6">
            
            {/* Display Name Input */}
            <div>
              <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-2">Display Username</label>
              <div className="relative shadow-sm rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-black dark:text-white stroke-[2.5px]" />
                </div>
                <input
                  type="text"
                  disabled={loading}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="e.g. Alex Carter"
                  className={`block w-full pl-11 pr-3 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 ${
                    nameError ? "border-rose-500" : "border-black dark:border-white focus:bg-white dark:focus:bg-[#242427]"
                  } rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none transition-colors`}
                />
              </div>
              {nameError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{nameError}</p>}
            </div>

            {/* Avatar section */}
            <div className="space-y-4">
              <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1">Avatar Profile Photo</label>
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white rounded-xl">
                
                {/* Photo Preview */}
                <div className="h-16 w-16 rounded-full border-2 border-black dark:border-white bg-white dark:bg-[#242427] overflow-hidden flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                  {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoURL} alt="Preview Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-black dark:text-white" />
                  )}
                </div>

                <div className="flex-1 w-full space-y-3">
                  {/* Presets Grid */}
                  <div>
                    <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Preset Avatars</span>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={loading}
                          onClick={() => selectPresetAvatar(preset)}
                          className="px-2.5 py-1 text-[10px] font-black border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-purple-100 dark:hover:bg-purple-950/40 text-black dark:text-white rounded-md shadow-[1.5px_1.5px_0px_#000000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_#000000] dark:hover:shadow-[1px_1px_0px_#FFFFFF] cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Raw URL Input */}
                  <div className="relative shadow-sm rounded-xl">
                    <input
                      type="url"
                      disabled={loading}
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="Or paste custom image URL..."
                      className="block w-full px-3.5 py-2.5 bg-white dark:bg-[#242427] border-2 border-black dark:border-white rounded-xl text-[10px] font-semibold text-black dark:text-white focus:outline-none placeholder-slate-550"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phone linking with countries select */}
            <div>
              <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-2">Link Phone Number</label>
              <div className="flex gap-3">
                
                {/* Country selector */}
                <div className="w-1/3 relative shadow-sm rounded-xl">
                  <select
                    disabled={loading}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="block w-full px-3.5 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white rounded-xl text-xs font-black text-black dark:text-white focus:outline-none cursor-pointer appearance-none text-center"
                  >
                    {COUNTRIES.map((c, idx) => (
                      <option key={idx} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone Input */}
                <div className="flex-1 relative shadow-sm rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4.5 w-4.5 text-black dark:text-white stroke-[2.5px]" />
                  </div>
                  <input
                    type="tel"
                    disabled={loading}
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="e.g. 9876543210"
                    className={`block w-full pl-11 pr-3 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 ${
                      phoneError ? "border-rose-500" : "border-black dark:border-white focus:bg-white dark:focus:bg-[#242427]"
                    } rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none transition-colors`}
                  />
                </div>
              </div>
              {phoneError && <p className="mt-1.5 text-xs text-rose-600 font-bold">{phoneError}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-6 border-t-2 border-black dark:border-white mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 px-6 py-3 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-600 border-2 border-black dark:border-white text-xs font-black text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black dark:text-white" />
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
