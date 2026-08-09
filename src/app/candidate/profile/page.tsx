
"use client";

import { ChangeEvent, useEffect, useState } from "react";
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
  Trash2,
  Upload,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const PROFILE_BUCKET = "profile picture";
const RESUME_BUCKET = "resumes";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean | null;
};

type MessageType = "success" | "error" | "";

export default function CandidateProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(
    null,
  );
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  function showMessage(type: Exclude<MessageType, "">, text: string) {
    setMessageType(type);
    setMessage(text);
  }

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  async function loadProfile() {
    setLoading(true);
    clearMessage();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, avatar_url, role, is_active",
        )
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Candidate profile could not be found.");
      }

      if (data.role !== "candidate") {
        throw new Error("Only candidate accounts can access this page.");
      }

      const profileData = data as Profile;

      setProfile(profileData);
      setFullName(profileData.full_name ?? "");
      setPhone(profileData.phone ?? "");
      setProfileImageUrl(profileData.avatar_url ?? null);

      await loadResume(user.id);
    } catch (error) {
      console.error("Profile loading error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to load your profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadResume(userId: string) {
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .list(userId, {
        limit: 20,
        sortBy: {
          column: "created_at",
          order: "desc",
        },
      });

    if (error) {
      console.error("Resume listing error:", error);

      // A missing/empty folder should not prevent the profile page
      // from loading.
      setResumeUrl(null);
      setResumeName(null);
      return;
    }

    if (!data || data.length === 0) {
      setResumeUrl(null);
      setResumeName(null);
      return;
    }

    const resumeFile = data.find(
      (file) => file.name && !file.name.endsWith("/"),
    );

    if (!resumeFile) {
      setResumeUrl(null);
      setResumeName(null);
      return;
    }

    const filePath = `${userId}/${resumeFile.name}`;

    const { data: publicData } = supabase.storage
      .from(RESUME_BUCKET)
      .getPublicUrl(filePath);

    setResumeUrl(publicData.publicUrl);
    setResumeName(resumeFile.name);
  }

  async function saveProfile() {
    if (!profile) return;

    clearMessage();

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      showMessage("error", "Full name is required.");
      return;
    }

    setSavingProfile(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: trimmedPhone || null,
        })
        .eq("id", profile.id)
        .select(
          "id, full_name, email, phone, avatar_url, role, is_active",
        )
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data as Profile);
      }

      showMessage("success", "Profile details saved successfully.");
    } catch (error) {
      console.error("Profile save error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to save your profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function validateFile(
    file: File,
    type: "image" | "resume",
  ): boolean {
    if (file.size > MAX_FILE_SIZE) {
      showMessage(
        "error",
        `${type === "image" ? "Profile picture" : "Resume"} must be 2 MB or smaller.`,
      );
      return false;
    }

    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        showMessage(
          "error",
          "Please select a valid image file.",
        );
        return false;
      }

      return true;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const validExtension = ["pdf", "doc", "docx"].includes(
      extension ?? "",
    );

    if (!allowedTypes.includes(file.type) && !validExtension) {
      showMessage(
        "error",
        "Resume must be a PDF, DOC, or DOCX file.",
      );
      return false;
    }

    return true;
  }

  function getFileExtension(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension) {
      return "bin";
    }

    return extension.replace(/[^a-z0-9]/g, "");
  }

  async function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file || !profile) return;

    clearMessage();

    if (!validateFile(file, "image")) {
      return;
    }

    setUploadingImage(true);

    try {
      const extension = getFileExtension(file);

      const filePath = `${profile.id}/profile-picture.${extension}`;

      // Remove existing profile-picture files first.
      const { data: existingFiles, error: listError } =
        await supabase.storage.from(PROFILE_BUCKET).list(profile.id);

      if (listError) {
        throw listError;
      }

      if (existingFiles && existingFiles.length > 0) {
        const oldFiles = existingFiles
          .filter((item) => item.name)
          .map((item) => `${profile.id}/${item.name}`);

        if (oldFiles.length > 0) {
          const { error: removeError } = await supabase.storage
            .from(PROFILE_BUCKET)
            .remove(oldFiles);

          if (removeError) {
            throw removeError;
          }
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from(PROFILE_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", profile.id);

      if (updateError) {
        // If the database update fails, clean up the uploaded file.
        await supabase.storage
          .from(PROFILE_BUCKET)
          .remove([filePath]);

        throw updateError;
      }

      setProfileImageUrl(publicUrl);

      setProfile((current) =>
        current
          ? {
              ...current,
              avatar_url: publicUrl,
            }
          : current,
      );

      showMessage(
        "success",
        "Profile picture uploaded successfully.",
      );
    } catch (error) {
      console.error("Profile picture upload error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to upload profile picture.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteProfileImage() {
    if (!profile || !profileImageUrl) return;

    clearMessage();
    setDeletingImage(true);

    try {
      const { data: files, error: listError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .list(profile.id);

      if (listError) {
        throw listError;
      }

      if (files && files.length > 0) {
        const paths = files
          .filter((file) => file.name)
          .map((file) => `${profile.id}/${file.name}`);

        if (paths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from(PROFILE_BUCKET)
            .remove(paths);

          if (deleteError) {
            throw deleteError;
          }
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
        })
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfileImageUrl(null);

      setProfile((current) =>
        current
          ? {
              ...current,
              avatar_url: null,
            }
          : current,
      );

      showMessage(
        "success",
        "Profile picture removed successfully.",
      );
    } catch (error) {
      console.error("Profile picture deletion error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to remove profile picture.",
      );
    } finally {
      setDeletingImage(false);
    }
  }

  async function handleResumeChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !profile) return;

    clearMessage();

    if (!validateFile(file, "resume")) {
      return;
    }

    setUploadingResume(true);

    try {
      // Remove existing resume files first so only one resume
      // is associated with the candidate.
      const { data: existingFiles, error: listError } =
        await supabase.storage.from(RESUME_BUCKET).list(profile.id);

      if (listError) {
        throw listError;
      }

      if (existingFiles && existingFiles.length > 0) {
        const oldFiles = existingFiles
          .filter((item) => item.name)
          .map((item) => `${profile.id}/${item.name}`);

        if (oldFiles.length > 0) {
          const { error: removeError } = await supabase.storage
            .from(RESUME_BUCKET)
            .remove(oldFiles);

          if (removeError) {
            throw removeError;
          }
        }
      }

      const extension = getFileExtension(file);

      const filePath = `${profile.id}/resume.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from(RESUME_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

      setResumeUrl(publicUrl);
      setResumeName(file.name);

      showMessage(
        "success",
        "Resume uploaded successfully.",
      );
    } catch (error) {
      console.error("Resume upload error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to upload resume.",
      );
    } finally {
      setUploadingResume(false);
    }
  }

  async function deleteResume() {
    if (!profile || !resumeName) return;

    clearMessage();
    setDeletingResume(true);

    try {
      const { data: files, error: listError } = await supabase.storage
        .from(RESUME_BUCKET)
        .list(profile.id);

      if (listError) {
        throw listError;
      }

      if (files && files.length > 0) {
        const paths = files
          .filter((file) => file.name)
          .map((file) => `${profile.id}/${file.name}`);

        if (paths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from(RESUME_BUCKET)
            .remove(paths);

          if (deleteError) {
            throw deleteError;
          }
        }
      }

      setResumeUrl(null);
      setResumeName(null);

      showMessage(
        "success",
        "Resume removed successfully.",
      );
    } catch (error) {
      console.error("Resume deletion error:", error);

      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to remove resume.",
      );
    } finally {
      setDeletingResume(false);
    }
  }

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
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BriefcaseBusiness size={18} />
              </div>
              <span className="text-sm font-bold">RMS</span>
            </div>

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
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />

          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
            <div className="h-[600px] animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main
        className={`flex min-h-dvh items-center justify-center px-4 ${
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
            size={34}
            className="mx-auto text-slate-400"
          />

          <h1 className="mt-5 text-xl font-bold">
            Unable to load profile
          </h1>

          <p
            className={`mt-2 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {message || "Your candidate profile could not be loaded."}
          </p>

          <Link
            href="/candidate/dashboard"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to dashboard
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
      {/* Background */}
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[650px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode ? "bg-cyan-950/20" : "bg-cyan-100/50"
        }`}
      />

      {/* Header */}
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
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
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
              {darkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
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
            Manage your personal information, profile picture, and resume.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              messageType === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span>{message}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Profile card */}
          <aside className="space-y-6">
            <section
              className={`rounded-3xl border p-6 shadow-sm ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-center">
                <div
                  className={`relative mx-auto flex size-32 items-center justify-center overflow-hidden rounded-full border-4 shadow-sm ${
                    darkMode
                      ? "border-white/10 bg-white/10"
                      : "border-white bg-slate-100"
                  }`}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
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

                <h2 className="mt-4 break-words text-lg font-bold">
                  {fullName || "Candidate"}
                </h2>

                <p
                  className={`mt-1 flex items-center justify-center gap-1.5 text-sm ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  <Mail size={14} />
                  <span className="max-w-[210px] truncate">
                    {profile.email || "No email"}
                  </span>
                </p>

                <label
                  className={`mt-5 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                    darkMode
                      ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } ${
                    uploadingImage
                      ? "pointer-events-none opacity-60"
                      : ""
                  }`}
                >
                  {uploadingImage ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={16} />
                  )}

                  {uploadingImage
                    ? "Uploading..."
                    : profileImageUrl
                      ? "Replace picture"
                      : "Upload picture"}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                    disabled={uploadingImage}
                  />
                </label>

                {profileImageUrl && (
                  <button
                    type="button"
                    onClick={deleteProfileImage}
                    disabled={deletingImage}
                    className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingImage ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}

                    {deletingImage
                      ? "Removing..."
                      : "Remove picture"}
                  </button>
                )}

                <p
                  className={`mt-4 text-[11px] leading-5 ${
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-500"
                  }`}
                >
                  JPG, PNG, WEBP or another image format.
                  Maximum size: 2 MB.
                </p>
              </div>
            </section>

            {/* Security */}
            <section
              className={`rounded-3xl border p-5 ${
                darkMode
                  ? "border-cyan-400/10 bg-cyan-400/[0.04]"
                  : "border-cyan-200 bg-cyan-50"
              }`}
            >
              <div className="flex gap-3">
                <ShieldCheck
                  size={20}
                  className="shrink-0 text-cyan-700 dark:text-cyan-400"
                />

                <div>
                  <h3 className="text-sm font-semibold">
                    Profile security
                  </h3>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    Your profile information is securely stored
                    and only available to authorized users.
                  </p>
                </div>
              </div>
            </section>
          </aside>

          {/* Main */}
          <div className="min-w-0 space-y-6">
            {/* Personal details */}
            <section
              className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
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
                  Keep your candidate information up to date.
                </p>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <User
                      size={17}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    />

                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      className={`h-12 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition ${
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
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        darkMode
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    />

                    <input
                      id="email"
                      type="email"
                      value={profile.email ?? ""}
                      disabled
                      className={`h-12 w-full cursor-not-allowed rounded-xl border pl-10 pr-4 text-sm ${
                        darkMode
                          ? "border-white/10 bg-white/[0.03] text-slate-500"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    />
                  </div>

                  <p
                    className={`mt-1.5 text-[11px] ${
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
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
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
                      className={`h-12 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition ${
                        darkMode
                          ? "border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus:border-white/25"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                      }`}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {savingProfile ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {savingProfile
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </section>

            {/* Resume */}
            <section
              className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <h2 className="text-lg font-bold">
                  Resume
                </h2>

                <p
                  className={`mt-1 text-sm ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Upload the resume recruiters should review
                  with your applications.
                </p>
              </div>

              {resumeUrl ? (
                <div
                  className={`mt-6 rounded-2xl border p-4 ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                          darkMode
                            ? "bg-white/10 text-slate-300"
                            : "bg-white text-slate-600"
                        }`}
                      >
                        <FileText size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {resumeName || "Resume"}
                        </p>

                        <p
                          className={`mt-0.5 text-xs ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          Current resume
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                          darkMode
                            ? "border-white/10 text-white hover:bg-white/10"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        View resume
                      </a>

                      <label
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 ${
                          uploadingResume
                            ? "pointer-events-none opacity-60"
                            : ""
                        }`}
                      >
                        {uploadingResume ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Upload size={15} />
                        )}

                        Replace

                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={handleResumeChange}
                          disabled={uploadingResume}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={deleteResume}
                        disabled={deletingResume}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingResume ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={15} />
                        )}

                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                    darkMode
                      ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
                  } ${
                    uploadingResume
                      ? "pointer-events-none opacity-60"
                      : ""
                  }`}
                >
                  <div
                    className={`flex size-12 items-center justify-center rounded-2xl ${
                      darkMode
                        ? "bg-white/10 text-slate-300"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {uploadingResume ? (
                      <Loader2
                        size={22}
                        className="animate-spin"
                      />
                    ) : (
                      <Upload size={22} />
                    )}
                  </div>

                  <p className="mt-4 text-sm font-semibold">
                    {uploadingResume
                      ? "Uploading resume..."
                      : "Upload your resume"}
                  </p>

                  <p
                    className={`mt-1 max-w-sm text-xs leading-5 ${
                      darkMode
                        ? "text-slate-500"
                        : "text-slate-500"
                    }`}
                  >
                    PDF, DOC, or DOCX. Maximum file size is
                    2 MB.
                  </p>

                  <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                    <Upload size={15} />
                    Choose file
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleResumeChange}
                    disabled={uploadingResume}
                  />
                </label>
              )}
            </section>

            {/* Profile completeness */}
            <section
              className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h2 className="text-lg font-bold">
                Profile readiness
              </h2>

              <div className="mt-5 space-y-3">
                <ReadinessItem
                  completed={Boolean(fullName.trim())}
                  label="Full name"
                  darkMode={darkMode}
                />

                <ReadinessItem
                  completed={Boolean(profile.email)}
                  label="Email address"
                  darkMode={darkMode}
                />

                <ReadinessItem
                  completed={Boolean(phone.trim())}
                  label="Phone number"
                  darkMode={darkMode}
                />

                <ReadinessItem
                  completed={Boolean(profileImageUrl)}
                  label="Profile picture"
                  darkMode={darkMode}
                />

                <ReadinessItem
                  completed={Boolean(resumeUrl)}
                  label="Resume"
                  darkMode={darkMode}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReadinessItem({
  completed,
  label,
  darkMode,
}: {
  completed: boolean;
  label: string;
  darkMode: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        darkMode
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <span
        className={`text-sm font-medium ${
          darkMode ? "text-slate-300" : "text-slate-700"
        }`}
      >
        {label}
      </span>

      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          completed
            ? "text-emerald-600 dark:text-emerald-400"
            : darkMode
              ? "text-slate-500"
              : "text-slate-400"
        }`}
      >
        <CheckCircle2 size={15} />
        {completed ? "Complete" : "Missing"}
      </span>
    </div>
  );
}
