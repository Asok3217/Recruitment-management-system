"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  User,
  X,
  Sun,
} from "lucide-react";

type CandidateLayoutProps = {
  children: React.ReactNode;
};

const navigation = [
  {
    name: "Dashboard",
    href: "/candidate/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Jobs",
    href: "/candidate/jobs",
    icon: BriefcaseBusiness,
  },
  {
    name: "Applications",
    href: "/candidate/applications",
    icon: FileText,
  },
  {
    name: "Profile",
    href: "/candidate/profile",
    icon: User,
  },
];

export default function CandidateLayout({
  children,
}: CandidateLayoutProps) {
  const pathname = usePathname();

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /*
   * Keep the theme state synchronized with the html element.
   * This also works with the existing dark-mode classes used
   * throughout the candidate pages.
   */
  useEffect(() => {
    const storedTheme = localStorage.getItem("candidate-theme");

    if (storedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else if (storedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setDarkMode(prefersDark);

      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  /*
   * Close the mobile sidebar whenever the route changes.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /*
   * Prevent the page from scrolling while the mobile sidebar
   * is open.
   */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;

      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("candidate-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("candidate-theme", "light");
      }

      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/candidate/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className={`min-h-dvh transition-colors duration-300 ${
        darkMode
          ? "bg-[#070a10] text-white"
          : "bg-[#f4f7fb] text-slate-900"
      }`}
    >
      {/* =====================================================
          DESKTOP NAVBAR
          Visible only on medium/large screens.
          ===================================================== */}

      <header
        className={`sticky top-0 z-40 hidden border-b backdrop-blur-xl md:block ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200/80 bg-white/90"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/candidate/dashboard"
            className="flex items-center gap-2.5"
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl shadow-sm ${
                darkMode
                  ? "bg-white text-slate-900"
                  : "bg-slate-900 text-white"
              }`}
            >
              <BriefcaseBusiness size={18} strokeWidth={2.2} />
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">
                RMS
              </span>

              <span
                className={`hidden text-[10px] leading-none sm:block ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Candidate Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition ${
                    active
                      ? darkMode
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-950"
                      : darkMode
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex size-10 items-center justify-center rounded-full border transition ${
              darkMode
                ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {darkMode ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          MOBILE HEADER
          Visible only on small screens.
          ===================================================== */}

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl md:hidden ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200/80 bg-white/95"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {/* Menu button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className={`flex size-10 items-center justify-center rounded-xl border transition ${
              darkMode
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Menu size={20} />
          </button>

          {/* Mobile Logo */}
          <Link
            href="/candidate/dashboard"
            className="flex items-center gap-2"
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl ${
                darkMode
                  ? "bg-white text-slate-900"
                  : "bg-slate-900 text-white"
              }`}
            >
              <BriefcaseBusiness size={17} />
            </div>

            <span className="text-sm font-bold">RMS</span>
          </Link>

          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex size-10 items-center justify-center rounded-full border ${
              darkMode
                ? "border-white/10 bg-white/10 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {darkMode ? (
              <Sun size={17} />
            ) : (
              <Moon size={17} />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          MOBILE SIDEBAR OVERLAY
          Only exists/appears on small screens.
          ===================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Candidate navigation"
        >
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sidebar */}
          <aside
            className={`absolute left-0 top-0 flex h-dvh w-[290px] max-w-[85vw] flex-col border-r shadow-2xl ${
              darkMode
                ? "border-white/10 bg-[#0b0f17]"
                : "border-slate-200 bg-white"
            }`}
          >
            {/* Sidebar header */}
            <div
              className={`flex h-16 shrink-0 items-center justify-between border-b px-4 ${
                darkMode
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
              <Link
                href="/candidate/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div
                  className={`flex size-9 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-white text-slate-900"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  <BriefcaseBusiness size={18} />
                </div>

                <div>
                  <p className="text-sm font-bold">RMS</p>

                  <p
                    className={`text-[10px] ${
                      darkMode
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    Candidate Portal
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                className={`flex size-9 items-center justify-center rounded-xl transition ${
                  darkMode
                    ? "text-slate-400 hover:bg-white/10 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <X size={19} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-5">
              <p
                className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Navigation
              </p>

              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                        active
                          ? darkMode
                            ? "bg-white/10 text-white"
                            : "bg-slate-100 text-slate-950"
                          : darkMode
                            ? "text-slate-400 hover:bg-white/5 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          active
                            ? darkMode
                              ? "text-white"
                              : "text-slate-900"
                            : ""
                        }
                      />

                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Sidebar footer */}
            <div
              className={`shrink-0 border-t p-4 ${
                darkMode
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={toggleTheme}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                  darkMode
                    ? "text-slate-300 hover:bg-white/5"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {darkMode ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}

                <span>
                  {darkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"}
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================
          PAGE CONTENT
          ===================================================== */}

      <main className="min-h-[calc(100dvh-64px)]">
        {children}
      </main>
    </div>
  );
}