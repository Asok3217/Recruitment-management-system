
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Phone,
  Sun,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleRegister() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const inputClass = `
    h-12 w-full rounded-xl border pl-11 pr-4
    text-sm outline-none transition-all
    placeholder:text-slate-400
    ${
      darkMode
        ? "border-white/10 bg-white/[0.06] text-white focus:border-white/25 focus:bg-white/[0.09]"
        : "border-slate-200/70 bg-slate-100/70 text-slate-900 focus:border-slate-300 focus:bg-white"
    }
  `;

  return (
    <main
      className={`relative min-h-dvh overflow-hidden transition-colors duration-500 ${
        darkMode
          ? "bg-[#080b12] text-white"
          : "bg-[#edf8ff] text-[#111318]"
      }`}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_50%_0%,#19344b_0%,#080b12_48%,#05070b_100%)]"
              : "bg-[radial-gradient(circle_at_50%_0%,#c8efff_0%,#edf8ff_48%,#ffffff_100%)]"
          }`}
        />

        <div
          className={`absolute left-1/2 top-[42%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            darkMode ? "border-white/[0.035]" : "border-white/80"
          }`}
        />

        <div
          className={`absolute left-1/2 top-[42%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            darkMode ? "border-white/[0.035]" : "border-white/70"
          }`}
        />

        <div
          className={`absolute left-1/2 top-[30%] h-80 w-80 -translate-x-1/2 rounded-full blur-3xl ${
            darkMode ? "bg-cyan-900/20" : "bg-cyan-200/40"
          }`}
        />

        <div
          className={`absolute -bottom-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-[50%] blur-3xl ${
            darkMode ? "bg-slate-950/80" : "bg-white/90"
          }`}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Recruitment Management System"
        >
          <div
            className={`flex size-9 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-105 ${
              darkMode
                ? "bg-white text-[#111318]"
                : "bg-[#17191f] text-white"
            }`}
          >
            <BriefcaseBusiness size={18} strokeWidth={2.3} />
          </div>

          <span className="text-base font-bold tracking-tight sm:text-lg">
            RMS
          </span>
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          className={`flex size-10 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
            darkMode
              ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
              : "border-black/5 bg-white/60 text-slate-700 hover:bg-white"
          }`}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main */}
      <section className="relative z-10 flex min-h-[calc(100dvh-80px)] items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div
          className={`my-4 w-full max-w-[440px] rounded-[28px] border p-5 shadow-2xl backdrop-blur-2xl sm:p-7 ${
            darkMode
              ? "border-white/10 bg-white/[0.065] shadow-black/50"
              : "border-white/80 bg-white/70 shadow-slate-300/30"
          }`}
        >
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Create your account
            </h1>

            <p
              className={`mt-2 max-w-[340px] text-sm leading-5 ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Join RMS and take the next step in your career journey.
            </p>
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Full name */}
            <div className="relative">
              <User
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              />

              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              />

              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              />

              <input
                type="tel"
                autoComplete="tel"
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <LockKeyhole
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              />

              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-white"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <LockKeyhole
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              />

              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-white"
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>

            {/* Password hint */}
            <p
              className={`px-1 text-[11px] ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Use at least 8 characters for your password.
            </p>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-500">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs leading-5 text-emerald-500">
                Account created successfully. Please check your email
                to verify your account.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className={`mt-2 h-12 w-full rounded-xl text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
                darkMode
                  ? "bg-white text-[#111318] shadow-black/20 hover:bg-slate-200"
                  : "bg-[#18191f] text-white shadow-black/10 hover:bg-[#292a31]"
              }`}
            >
              {loading
                ? "Creating account..."
                : success
                  ? "Account created"
                  : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div
              className={`h-px flex-1 ${
                darkMode ? "bg-white/10" : "bg-slate-200"
              }`}
            />

            <span
              className={`text-[11px] ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              OR
            </span>

            <div
              className={`h-px flex-1 ${
                darkMode ? "bg-white/10" : "bg-slate-200"
              }`}
            />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all ${
              darkMode
                ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            <span className="text-base font-bold">G</span>
            Continue with Google
          </button>

          {/* Login */}
          <p
            className={`mt-5 text-center text-sm ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className={`font-semibold transition-colors ${
                darkMode
                  ? "text-white hover:text-slate-300"
                  : "text-slate-900 hover:text-slate-600"
              }`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
