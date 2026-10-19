import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";
import {
  Home,
  Sparkles,
  HelpCircle,
  Settings,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export type DashboardTab = "home" | "templates" | "support" | "settings";

interface DashboardLayoutProps {
  activeTab: DashboardTab;
  children: ReactNode;
}

const sidebarLinks = [
  { key: "home", label: "Home", icon: Home, to: "/dashboard" },
  { key: "templates", label: "Templates", icon: Sparkles, to: "/editor" },
  { key: "support", label: "Help and Support", icon: HelpCircle },
  { key: "settings", label: "Setting", icon: Settings, to: "/profile" },
] as const;

export function DashboardLayout({ activeTab, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col justify-between">
      {/* Top: Logo & Navigation */}
      <div className="space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            to="/"
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className="inline-flex items-center transition-opacity hover:opacity-85"
            aria-label="ProCaptioner Home"
          >
            <ProCaptionerLogo size="lg" theme="dark" />
          </Link>
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="space-y-1">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            if ("to" in item && item.to) {
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-neutral-800/70 text-white shadow-sm font-semibold"
                      : "text-neutral-400 hover:bg-neutral-800/40 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (isMobile) setMobileMenuOpen(false);
                  navigate({ to: "/dashboard" });
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-800/70 text-white shadow-sm font-semibold"
                    : "text-neutral-400 hover:bg-neutral-800/40 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Free Tier Usage Card */}
      <div className="space-y-4 pt-4">
        <div className="rounded-xl border border-neutral-800/80 bg-[#121212] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white tracking-wide">FREE</span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-bold tracking-widest text-emerald-400 border border-emerald-500/20 uppercase">
              MONTHLY
            </span>
          </div>

          <div className="space-y-2 text-[0.75rem]">
            <div className="flex justify-between text-neutral-400">
              <span>Storage</span>
              <span className="text-emerald-400 font-mono text-xs">&lt; 0.1 GB / 5.0 GB</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Transcription</span>
              <span className="text-neutral-200 font-mono text-xs">4.3 mins left</span>
            </div>
            <div className="mt-1.5 flex h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full bg-emerald-500 w-[15%] rounded-full" />
            </div>
            <div className="flex justify-between text-neutral-400 pt-0.5">
              <span>Audio Clean</span>
              <span className="text-neutral-200 font-mono text-xs">0 / 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-[#080808] text-foreground selection:bg-[#ff7a00] selection:text-black overflow-hidden font-sans">
      {/* ── Left Sidebar (Desktop) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-neutral-800/80 bg-[#0c0c0c] p-4 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-[#0c0c0c] p-4 shadow-2xl md:hidden animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </>
      )}

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800/80 bg-[#0a0a0a] px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 md:hidden"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar */}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full rounded-lg border border-neutral-800 bg-[#121212] py-1.5 pl-9 pr-10 text-xs text-white placeholder-neutral-500 transition-colors focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00] focus:outline-none"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[0.58rem] text-neutral-400 hidden sm:inline">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right: User Profile Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-neutral-800 bg-[#121212] py-1 pl-1 pr-2.5 transition-colors hover:bg-neutral-800 cursor-pointer"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
                  alt="Paviter Sharma"
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="text-xs font-medium text-neutral-200 hidden sm:inline">
                  Paviter Sharma
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-neutral-400 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-neutral-800 bg-[#141414] p-1.5 shadow-2xl z-50 animate-in fade-in duration-100">
                  <div className="px-2.5 py-2 border-b border-neutral-800/80">
                    <p className="text-xs font-medium text-white truncate">Paviter Sharma</p>
                    <p className="text-[0.65rem] text-neutral-400 truncate">
                      pavitersharma2001@gmail.com
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white mt-1"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Account Settings</span>
                  </Link>
                  <div className="my-1 border-t border-neutral-800/80" />
                  <Link
                    to="/login"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
