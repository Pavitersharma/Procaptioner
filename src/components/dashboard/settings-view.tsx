import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  X,
  Shield,
  KeyRound,
  Download,
  Trash2,
  Bell,
  Sparkles,
  ExternalLink,
  Loader2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUsage } from "@/lib/usage";
import { supabase } from "@/lib/supabase";
import { UpgradeModal } from "@/components/payment/upgrade-modal";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  gender: string;
  language: string;
  authProvider: string;
  avatarUrl: string;
  passwordSet: boolean;
}

const COUNTRIES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
];

const GENDERS = ["Select gender", "Male", "Female", "Non-binary", "Prefer not to say"];

const LANGUAGES = [
  "Select language",
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Portuguese",
  "Arabic",
  "Russian",
  "Bengali",
  "Tamil",
  "Telugu",
];

export function SettingsView() {
  const { user, refreshUser } = useAuth();
  const { usage } = useUsage();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Main profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: "Creator",
    email: "",
    phone: "",
    countryCode: "+91",
    gender: "Select gender",
    language: "Select language",
    authProvider: "Email",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    passwordSet: false,
  });

  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata || {}) as Record<string, string>;
      const provider = (user.app_metadata?.provider as string) || "email";
      setProfile({
        name: meta["full_name"] || meta["name"] || user.email?.split("@")[0] || "Creator",
        email: user.email || "",
        phone: meta["phone"] || "",
        countryCode: meta["countryCode"] || "+91",
        gender: meta["gender"] || "Select gender",
        language: meta["language"] || "Select language",
        authProvider: provider.charAt(0).toUpperCase() + provider.slice(1),
        avatarUrl:
          meta["avatar_url"] ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
        passwordSet: provider === "email",
      });
    }
  }, [user]);

  // Modals state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form input state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfile((p) => ({ ...p, avatarUrl: url }));
      showToast("Profile photo updated");
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.name,
          phone: profile.phone,
          countryCode: profile.countryCode,
          gender: profile.gender,
          language: profile.language,
        },
      });
      if (error) throw error;

      if (user) {
        await supabase
          .from("profiles")
          .update({
            full_name: profile.name,
            avatar_url: profile.avatarUrl || null,
          })
          .eq("id", user.id);
      }

      await refreshUser();
      showToast("Personal details saved successfully");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) return;
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailModalOpen(false);
      setNewEmail("");
      showToast("Confirmation email sent to new address");
      await refreshUser();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update email");
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setProfile((p) => ({ ...p, passwordSet: true }));
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      showToast("Password set successfully");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to set password");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-[#0f1712] px-4 py-3 text-xs font-medium text-emerald-400 shadow-xl shadow-black/60 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── User Profile Header ── */}
      <div className="flex items-center gap-5">
        <div className="group relative">
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="h-20 w-20 rounded-full border border-neutral-700/60 object-cover shadow-lg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {profile.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-neutral-400">{profile.email}</span>
            <span className="rounded bg-neutral-800/80 px-2 py-0.5 text-[0.65rem] font-medium text-neutral-400 border border-neutral-700/40">
              via {profile.authProvider}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section: Plan & Billing ── */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-white">Subscription & Plan</h2>
          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
            Manage your billing, plan tier, and export allowances.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800/80 bg-[#121212] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold uppercase text-white">
                  {usage.plan === "creator_pro" ? "Creator Pro Plan" : "Free Plan"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[0.62rem] font-bold uppercase border ${
                    usage.plan === "creator_pro"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-700 bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {usage.plan === "creator_pro" ? "Active" : "Free Tier"}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {usage.plan === "creator_pro"
                  ? "₹199 / month • Watermark-free HD exports, 5 GB storage & priority processing active."
                  : "Basic preview access with watermarked exports and standard queue."}
              </p>
            </div>

            {usage.plan === "creator_pro" ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>Subscribed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff7a1a] px-4 py-2 font-mono text-xs font-bold text-black uppercase shadow-md shadow-orange-500/20 transition-all hover:bg-[#ff5b00] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Zap className="h-3.5 w-3.5 fill-black" />
                <span>Upgrade to Creator Pro (₹199)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Account ── */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-white">Account</h2>
          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
            The email and password you sign in with.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800/80 bg-[#121212] p-5 sm:p-6 shadow-sm">
          {/* Email row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-300">Email</p>
              <p className="mt-0.5 text-xs text-neutral-400">{profile.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewEmail(profile.email);
                setEmailModalOpen(true);
              }}
              className="self-start sm:self-auto rounded-lg border border-neutral-700/70 bg-[#1c1c1c] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] cursor-pointer"
            >
              Change email
            </button>
          </div>

          <div className="my-5 border-t border-neutral-800/80" />

          {/* Password row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-300">Password</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {profile.passwordSet ? "••••••••••••" : "Not set"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setPasswordModalOpen(true);
              }}
              className="self-start sm:self-auto rounded-lg border border-neutral-700/70 bg-[#1c1c1c] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] cursor-pointer"
            >
              {profile.passwordSet ? "Change password" : "Set password"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Personal details ── */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-white">Personal details</h2>
          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
            Your name, contact number, and preferred language.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800/80 bg-[#121212] p-5 sm:p-6 shadow-sm space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full rounded-lg border border-neutral-800 bg-[#0d0d0d] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] focus:outline-none"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Phone Number
            </label>
            <div className="flex rounded-lg border border-neutral-800 bg-[#0d0d0d] overflow-hidden focus-within:border-[#ff7a00] focus-within:ring-1 focus-within:ring-[#ff7a00]">
              <div className="relative flex items-center border-r border-neutral-800 bg-[#141414] px-3">
                <select
                  value={profile.countryCode}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      countryCode: e.target.value,
                    }))
                  }
                  className="appearance-none bg-transparent pr-5 text-xs text-neutral-200 outline-none cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option
                      key={c.code + c.name}
                      value={c.code}
                      className="bg-[#1a1a1a] text-white"
                    >
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-neutral-400" />
              </div>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Gender & Language */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Gender</label>
              <div className="relative flex items-center">
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
                  className="w-full appearance-none rounded-lg border border-neutral-800 bg-[#0d0d0d] px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] cursor-pointer"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g} className="bg-[#1a1a1a] text-white">
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Language</label>
              <div className="relative flex items-center">
                <select
                  value={profile.language}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="w-full appearance-none rounded-lg border border-neutral-800 bg-[#0d0d0d] px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l} className="bg-[#1a1a1a] text-white">
                      {l}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff7a00] px-5 py-2 font-mono text-xs font-bold tracking-[0.14em] text-black uppercase transition-all duration-150 hover:bg-[#ff881a] active:scale-[0.98] cursor-pointer shadow-md shadow-orange-500/10 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? "Saving..." : "Save details"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Settings ── */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
            Account preferences, data, and deactivation.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-neutral-800/80 bg-[#121212] p-5 sm:p-6 shadow-sm">
          <p className="text-xs text-neutral-400">Manage additional account settings.</p>
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="rounded-lg border border-neutral-700/70 bg-[#1c1c1c] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] cursor-pointer"
          >
            Open Settings
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════════ */}

      {/* 1. Change Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-[#141414] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Change Email</h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmail} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="w-full rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] focus:outline-none"
                />
              </div>

              <p className="text-[0.7rem] text-neutral-400 leading-relaxed">
                A verification link will be sent to your new address to confirm the change.
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="rounded-lg border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#ff7a00] px-4 py-2 font-mono text-xs font-bold tracking-wider text-black uppercase hover:bg-[#ff881a] cursor-pointer"
                >
                  Update Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Set / Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-[#141414] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">
                {profile.passwordSet ? "Change Password" : "Set Password"}
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSetPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] focus:outline-none"
                />
              </div>

              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-lg border border-neutral-800 px-3.5 py-2 text-xs text-neutral-300 hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#ff7a00] px-4 py-2 font-mono text-xs font-bold tracking-wider text-black uppercase hover:bg-[#ff881a] cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Additional Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-[#141414] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Account Settings & Preferences</h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Notification preferences */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-800/80 bg-[#0e0e0e] p-3.5">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-xs font-medium text-white">Email notifications</p>
                    <p className="text-[0.68rem] text-neutral-400">
                      Receive transcription and export completion alerts
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-[#ff7a00] h-4 w-4 rounded cursor-pointer"
                />
              </div>

              {/* Data Export */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-800/80 bg-[#0e0e0e] p-3.5">
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-xs font-medium text-white">Export workspace data</p>
                    <p className="text-[0.68rem] text-neutral-400">
                      Download all projects, subtitles, and export logs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Export requested. Check your email shortly.")}
                  className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-700 cursor-pointer"
                >
                  Export
                </button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-4 w-4 text-red-400" />
                    <div>
                      <p className="text-xs font-medium text-red-300">Deactivate Account</p>
                      <p className="text-[0.68rem] text-red-400/80">
                        Permanently remove your account and all projects
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to deactivate your account?")) {
                        showToast("Deactivation requested");
                        setSettingsModalOpen(false);
                      }
                    }}
                    className="rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20 cursor-pointer"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Creator Pro Upgrade Modal (Razorpay) ── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
