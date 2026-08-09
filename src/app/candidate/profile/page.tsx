"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Moon,
  Phone,
  Save,
  ShieldCheck,
  Sun,
  Upload,
  User,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const PROFILE_BUCKET = "profile picture";
const RESUME_BUCKET = "resumes";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_RESUME_TYPES = ["application/pdf"];

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean | null;
};

export default function CandidateProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState("");
  const [resumeName, setResumeName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setError("You must be logged in to view your profile.");
          setLoading(false);
        }
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, avatar_url, role, is_active"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError);

        if (mounted) {
          setError("Unable to load your profile.");
          setLoading(false);
        }

        return;
      }

      if (!mounted) return;

      const profileData = data as Profile;

      setProfile(profileData);
      setFullName(profileData.full_name ?? "");
      setEmail(profileData.email ?? user.email ?? "");
      setPhone(profileData.phone ?? "");
      setAvatarUrl(profileData.avatar_url ?? "");

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    clearMessages();

    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Profile picture must be 2 MB or less.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    clearMessages();

    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
      setError("Please upload your resume as a PDF.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Resume must be 2 MB or less.");
      event.target.value = "";
      return;
    }

    setSelectedResume(file);
    setResumeName(file.name);
  }

  async function uploadProfilePicture(userId: string) {
    if (!selectedImage) {
      return avatarUrl;
    }

    if (selectedImage.size > MAX_FILE_SIZE) {
      throw new Error("Profile picture must be 2 MB or less.");
    }

    if (!ALLOWED_IMAGE_TYPES.includes(selectedImage.type)) {
      throw new Error("Please select a JPG, PNG, or WebP image.");
    }

    setUploadingImage(true);

    try {
      const extension =
        selectedImage.type === "image/png"
          ? "png"
          : selectedImage.type === "image/webp"
            ? "webp"
            : "jpg";

      const filePath = `${userId}/profile-picture-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(filePath, selectedImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedImage.type,
        });

      if (uploadError) {
        console.error(uploadError);
        throw new Error(
          `Unable to upload profile picture: ${uploadError.message}`
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from(PROFILE_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } finally {
      setUploadingImage(false);
    }
  }

  async function uploadResume(userId: string) {
    if (!selectedResume) {
      return resumeUrl;
    }

    if (selectedResume.size > MAX_FILE_SIZE) {
      throw new Error("Resume must be 2 MB or less.");
    }

    if (!ALLOWED_RESUME_TYPES.includes(selectedResume.type)) {
      throw new Error("Please upload your resume as a PDF.");
    }

    setUploadingResume(true);

    try {
      const safeFileName = selectedResume.name
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");

      const filePath = `${userId}/resume-${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(filePath, selectedResume, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) {
        console.error(uploadError);
        throw new Error(
          `Unable to upload resume: ${uploadError.message}`
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from(RESUME_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      if (!fullName.trim()) {
        setError("Full name is required.");
        return;
      }

      if (selectedImage && selectedImage.size > MAX_FILE_SIZE) {
        setError("Profile picture must be 2 MB or less.");
        return;
      }

      if (selectedResume && selectedResume.size > MAX_FILE_SIZE) {
        setError("Resume must be 2 MB or less.");
        return;
      }

      let newAvatarUrl = avatarUrl;
      let newResumeUrl = resumeUrl;

      if (selectedImage) {
        newAvatarUrl = await uploadProfilePicture(user.id);
      }

      if (selectedResume) {
        newResumeUrl = await uploadResume(user.id);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          avatar_url: newAvatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(updateError);
        throw new Error(
          `Unable to save profile: ${updateError.message}`
        );
      }

      if (selectedResume) {
        const { data: existingApplication } = await supabase
          .from("applications")
          .select("id")
          .eq("candidate_id", user.id)
          .order("applied_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingApplication) {
          const { error: applicationUpdateError } = await supabase
            .from("applications")
            .update({
              resume_url: newResumeUrl || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingApplication.id);

          if (applicationUpdateError) {
            console.warn(
              "Resume uploaded, but application resume could not be updated:",
              applicationUpdateError
            );
          }
        }
      }

      setAvatarUrl(newAvatarUrl);
      setResumeUrl(newResumeUrl);

      setSelectedImage(null);
      setSelectedResume(null);

      if (newResumeUrl && !resumeName) {
        setResumeName("Resume uploaded");
      }

      setSuccess("Profile updated successfully.");

      setProfile((current) =>
        current
          ? {
              ...current,
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              avatar_url: newAvatarUrl || null,
            }
          : current
      );
    } catch (caughtError) {
      console.error(caughtError);

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while updating your profile.";

      setError(message);
    } finally {
      setSaving(false);
      setUploadingImage(false);
      setUploadingResume(false);
    }
  }

  function removeSelectedImage() {
    setSelectedImage(null);
    setImagePreview("");

    clearMessages();
  }

  function removeSelectedResume() {
    setSelectedResume(null);
    setResumeName("");

    clearMessages();
  }

  const displayedAvatar = imagePreview || avatarUrl;

  if (loading) {
    return (
      <main
        className={`min-h-dvh ${
          darkMode
            ? "bg-[#070a10] text-white"
            : "bg-[#f4f7fb] text-slate-900"
        }`}
      >
        <header
          className={`border-b ${
            darkMode
              ? "border-white/10 bg-[#070a10]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/candidate/dashboard"
              className="flex items-center gap-2.5"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BriefcaseBusiness size={18} />
              </div>

              <span className="text-sm font-bold sm:text-base">
                RMS
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className={`flex size-10 items-center justify-center rounded-full border ${
                darkMode
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-white/10" />

            <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="h-80 rounded-3xl bg-slate-200 dark:bg-white/10" />
              <div className="h-[600px] rounded-3xl bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main
        className={`min-h-dvh flex items-center justify-center px-4 ${
          darkMode
            ? "bg-[#070a10] text-white"
            : "bg-[#f4f7fb] text-slate-900"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl border p-8 text-center shadow-xl ${
            darkMode
              ? "border-white/10 bg-white/[0.05]"
              : "border-slate-200 bg-white"
          }`}
        >
          <User
            size={36}
            className="mx-auto text-slate-400"
          />

          <h1 className="mt-5 text-xl font-bold">
            Profile unavailable
          </h1>

          <p
            className={`mt-2 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {error || "Unable to load your profile."}
          </p>

          <Link
            href="/candidate/dashboard"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-dvh overflow-x-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#070a10] text-white"
          : "bg-[#f4f7fb] text-slate-900"
      }`}
    >
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[650px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode ? "bg-cyan-950/20" : "bg-cyan-100/50"
        }`}
      />

      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/candidate/dashboard"
            className="flex items-center gap-2.5"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
              <BriefcaseBusiness size={18} />
            </div>

            <span className="text-sm font-bold sm:text-base">
              RMS
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/candidate/dashboard"
              className={`hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium sm:flex ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className={`flex size-10 items-center justify-center rounded-full border shadow-sm ${
                darkMode
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/candidate/dashboard"
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              darkMode
                ? "text-slate-300 hover:text-white"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            My profile
          </h1>

          <p
            className={`mt-2 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Keep your personal information and application documents up
            to date.
          </p>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
              error
                ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-start gap-2">
              {error ? (
                <X size={17} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0"
                />
              )}

              <span>{error || success}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Profile card */}
          <aside
            className={`h-fit rounded-3xl border p-6 shadow-sm ${
              darkMode
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className={`flex size-32 items-center justify-center overflow-hidden rounded-full border-4 shadow-lg ${
                    darkMode
                      ? "border-white/10 bg-white/10"
                      : "border-white bg-slate-100"
                  }`}
                >
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt={fullName || "Profile picture"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <User
                      size={48}
                      className={
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-400"
                      }
                    />
                  )}
                </div>

                <label
                  className={`absolute bottom-1 right-1 flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-lg transition ${
                    darkMode
                      ? "border-white/10 bg-white text-slate-900 hover:bg-slate-200"
                      : "border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  title="Upload profile picture"
                >
                  <Upload size={17} />

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedImage && (
                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="mt-3 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Remove selected picture
                </button>
              )}

              <h2 className="mt-5 max-w-full truncate text-lg font-bold">
                {fullName || "Your name"}
              </h2>

              <p
                className={`mt-1 flex items-center gap-1.5 text-sm ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <Mail size={14} />
                <span className="max-w-[190px] truncate">
                  {email}
                </span>
              </p>

              <span
                className={`mt-4 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  darkMode
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "bg-cyan-50 text-cyan-700"
                }`}
              >
                {profile.role}
              </span>

              <div
                className={`mt-6 w-full rounded-2xl border p-4 text-left ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-cyan-600"
                  />

                  <div>
                    <p className="text-xs font-semibold">
                      Profile security
                    </p>

                    <p
                      className={`mt-1 text-[11px] leading-5 ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Your profile information is protected by your
                      account permissions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main form */}
          <form
            onSubmit={handleSaveProfile}
            className={`min-w-0 rounded-3xl border p-5 shadow-sm sm:p-7 ${
              darkMode
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Personal information
                </h2>

                <p
                  className={`mt-1 text-sm ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Update the information recruiters can see.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  uploadingImage ||
                  uploadingResume
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save changes
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold"
                >
                  Full name
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  />

                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none transition ${
                      darkMode
                        ? "border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus:border-white/25"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    }`}
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm ${
                      darkMode
                        ? "border-white/10 bg-white/[0.03] text-slate-400"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}
                  />
                </div>

                <p
                  className={`mt-2 text-[11px] ${
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-500"
                  }`}
                >
                  Email is managed by your account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  Phone number
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  />

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none transition ${
                      darkMode
                        ? "border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus:border-white/25"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    }`}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            {/* Profile picture */}
            <section
              className={`mt-8 rounded-2xl border p-5 ${
                darkMode
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">
                    Profile picture
                  </h3>

                  <p
                    className={`mt-1 text-xs ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    JPG, PNG, or WebP. Maximum file size:{" "}
                    <strong>2 MB</strong>.
                  </p>
                </div>

                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                  <Upload size={15} />
                  Choose image

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedImage && (
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl border p-3 ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Selected profile"
                          className="size-full object-cover"
                        />
                      ) : (
                        <User size={17} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {selectedImage.name}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        {(selectedImage.size / 1024 / 1024).toFixed(
                          2
                        )}{" "}
                        MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    className="ml-3 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label="Remove selected profile picture"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </section>

            {/* Resume */}
            <section
              className={`mt-5 rounded-2xl border p-5 ${
                darkMode
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">
                    Resume / CV
                  </h3>

                  <p
                    className={`mt-1 text-xs ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    PDF only. Maximum file size:{" "}
                    <strong>2 MB</strong>.
                  </p>
                </div>

                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                  <Upload size={15} />
                  Choose resume

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleResumeChange}
                    className="hidden"
                  />
                </label>
              </div>

              {(selectedResume || resumeUrl) && (
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl border p-3 ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        darkMode
                          ? "bg-red-500/10 text-red-400"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {selectedResume
                          ? selectedResume.name
                          : resumeName || "Resume uploaded"}
                      </p>

                      {selectedResume ? (
                        <p className="text-[11px] text-slate-500">
                          {(
                            selectedResume.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Resume available
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {resumeUrl && !selectedResume && (
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 sm:block dark:text-cyan-400 dark:hover:bg-cyan-400/10"
                      >
                        View
                      </a>
                    )}

                    {selectedResume && (
                      <button
                        type="button"
                        onClick={removeSelectedResume}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        aria-label="Remove selected resume"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Upload information */}
            <div
              className={`mt-5 flex gap-3 rounded-2xl border p-4 ${
                darkMode
                  ? "border-cyan-400/10 bg-cyan-400/[0.04]"
                  : "border-cyan-200 bg-cyan-50"
              }`}
            >
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-cyan-600"
              />

              <div>
                <p className="text-sm font-semibold">
                  File upload requirements
                </p>

                <p
                  className={`mt-1 text-xs leading-5 ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  Profile pictures must be JPG, PNG, or WebP and
                  resumes must be PDF files. Both files must be
                  no larger than 2 MB.
                </p>
              </div>
            </div>

            {/* Bottom save */}
            <div className="mt-7 flex justify-end border-t pt-6">
              <button
                type="submit"
                disabled={
                  saving ||
                  uploadingImage ||
                  uploadingResume
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving ||
                uploadingImage ||
                uploadingResume ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    {uploadingImage
                      ? "Uploading picture..."
                      : uploadingResume
                        ? "Uploading resume..."
                        : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}