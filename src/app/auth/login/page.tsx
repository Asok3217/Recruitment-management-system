
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // 1. Authenticate the user
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError("Unable to sign in. Please try again.");
        return;
      }

      // 2. Get the user's role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);

        await supabase.auth.signOut();

        setError(
          "Your account profile could not be loaded. Please contact the administrator."
        );

        return;
      }

      // 3. Check whether the account is active
      if (!profile.is_active) {
        await supabase.auth.signOut();

        setError(
          "Your account has been deactivated. Please contact the administrator."
        );

        return;
      }

      // 4. Redirect according to the user's role
      switch (profile.role) {
        case "admin":
          router.replace("/admin/dashboard");
          break;

        case "recruiter":
          router.replace("/recruiter/dashboard");
          break;

        case "candidate":
          router.replace("/candidate/dashboard");
          break;

        default:
          await supabase.auth.signOut();

          setError(
            "Your account has an invalid role. Please contact the administrator."
          );
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const { error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Unable to continue with Google.");
      setLoading(false);
    }
  }

  return (
    <main
      className={`relative min-h-dvh overflow-hidden transition-colors duration-500 ${
        darkMode
          ? "bg-[#080b12] text-white"
          : "bg-[#eaf7ff] text-[#111318]"
      }`}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_50%_20%,#19324b_0%,#080b12_55%,#05070b_100%)]"
              : "bg-[radial-gradient(circle_at_50%_15%,#c9efff_0%,#eaf7ff_45%,#ffffff_100%)]"
          }`}
        />

        {/* Decorative circles */}
        <div
          className={`absolute left-1/2 top-[44%] h-[700px] w-[700px] max-w-[170vw] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            darkMode ? "border-white/5" : "border-white/80"
          }`}
        />

        <div
          className={`absolute left-1/2 top-[44%] h-[500px] w-[500px] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            darkMode ? "border-white/5" : "border-white/70"
          }`}
        />

        {/* Soft glow */}
        <div
          className={`absolute left-1/2 top-[38%] h-80 w-80 max-w-[80vw] -translate-x-1/2 rounded-full blur-3xl ${
            darkMode ? "bg-cyan-900/20" : "bg-cyan-200/40"
          }`}
        />

        {/* Bottom glow */}
        <div
          className={`absolute -bottom-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-[50%] blur-3xl ${
            darkMode ? "bg-slate-900/80" : "bg-white/90"
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
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#17191f] text-white shadow-lg transition-transform group-hover:scale-105 dark:bg-white dark:text-[#111318]">
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
          aria-label={
            darkMode ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Login area */}
      <section className="relative z-10 flex min-h-[calc(100dvh-80px)] items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div
          className={`w-full max-w-[390px] rounded-[28px] border p-5 shadow-2xl backdrop-blur-2xl sm:p-7 ${
            darkMode
              ? "border-white/10 bg-white/[0.07] shadow-black/50"
              : "border-white/70 bg-white/65 shadow-slate-300/30"
          }`}
        >
          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[27px]">
              Welcome back
            </h1>

            <p
              className={`mx-auto mt-2 max-w-[280px] text-sm leading-5 ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Sign in to manage your recruitment journey.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.07] text-white focus:border-white/25 focus:bg-white/10"
                    : "border-transparent bg-slate-100/80 text-slate-900 focus:border-slate-200 focus:bg-white"
                }`}
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
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`h-12 w-full rounded-xl border pl-11 pr-11 text-sm outline-none transition-all placeholder:text-slate-400 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.07] text-white focus:border-white/25 focus:bg-white/10"
                    : "border-transparent bg-slate-100/80 text-slate-900 focus:border-slate-200 focus:bg-white"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition ${
                  darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-400 hover:text-slate-700"
                }`}
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

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className={`text-xs font-medium transition ${
                  darkMode
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-500"
              >
                {error}
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#18191f] text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[#24252c] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#111318] dark:hover:bg-slate-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
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
              Or continue with
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
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              darkMode
                ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            <span className="text-base font-bold">G</span>
            Continue with Google
          </button>

          {/* Register */}
          <p
            className={`mt-6 text-center text-sm ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className={`font-semibold ${
                darkMode
                  ? "text-white hover:text-slate-300"
                  : "text-slate-900 hover:text-slate-600"
              }`}
            >
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
