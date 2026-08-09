
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Moon,
  Send,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  employment_type:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship";
  experience_level:
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "executive"
    | null;
  salary_min: number | null;
  salary_max: number | null;
  application_deadline: string | null;
  status: string;
  company_id: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
    description: string | null;
    location: string | null;
    industry: string | null;
  } | null;
};

type Profile = {
  id: string;
  role: string;
};

function formatEmploymentType(value: Job["employment_type"]) {
  return value
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExperience(value: Job["experience_level"]) {
  if (!value) return "Not specified";

  return value
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSalary(
  min: number | null,
  max: number | null
) {
  if (min !== null && max !== null) {
    return `NPR ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }

  if (min !== null) {
    return `From NPR ${min.toLocaleString()}`;
  }

  if (max !== null) {
    return `Up to NPR ${max.toLocaleString()}`;
  }

  return "Salary not disclosed";
}

function formatDate(date: string | null) {
  if (!date) return "Not specified";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CandidateJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  /*
   * IMPORTANT:
   * useParams() can return string | string[] | undefined.
   * We normalize it into a guaranteed string.
   */
  const rawJobId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const jobId =
    typeof rawJobId === "string" ? rawJobId : "";

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  /*
   * Load job
   */
  useEffect(() => {
    if (!jobId) {
      setError("Invalid job ID.");
      setLoading(false);
      return;
    }

    async function loadJob() {
      setLoading(true);
      setError("");

      try {
        /*
         * Get currently logged-in user
         */
        const {
          data: { user },
        } = await supabase.auth.getUser();

        /*
         * Load candidate profile and application status
         */
        if (user) {
          const { data: profileData } =
            await supabase
              .from("profiles")
              .select("id, role")
              .eq("id", user.id)
              .single();

          if (profileData) {
            setProfile(profileData as Profile);
          }

          const { data: applicationData } =
            await supabase
              .from("applications")
              .select("id")
              .eq("candidate_id", user.id)
              .eq("job_id", jobId)
              .maybeSingle();

          if (applicationData) {
            setAlreadyApplied(true);
          }
        }

        /*
         * Load published job
         */
        const { data, error: jobError } =
          await supabase
            .from("jobs")
            .select(
              `
                id,
                title,
                description,
                requirements,
                responsibilities,
                location,
                employment_type,
                experience_level,
                salary_min,
                salary_max,
                application_deadline,
                status,
                company_id,
                companies (
                  id,
                  name,
                  logo_url,
                  website_url,
                  description,
                  location,
                  industry
                )
              `
            )
            .eq("id", jobId)
            .eq("status", "published")
            .single();

        if (jobError) {
          console.error(jobError);
          setError("Unable to load this job.");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("Job not found.");
          setLoading(false);
          return;
        }

        const raw = data as any;

        const normalizedJob: Job = {
          id: raw.id,
          title: raw.title,
          description: raw.description,
          requirements: raw.requirements,
          responsibilities: raw.responsibilities,
          location: raw.location,
          employment_type: raw.employment_type,
          experience_level: raw.experience_level,
          salary_min: raw.salary_min,
          salary_max: raw.salary_max,
          application_deadline:
            raw.application_deadline,
          status: raw.status,
          company_id: raw.company_id,
          company: Array.isArray(raw.companies)
            ? raw.companies[0] ?? null
            : raw.companies ?? null,
        };

        setJob(normalizedJob);
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading the job.");
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId, supabase]);

  /*
   * Apply for job
   */
  async function handleApply() {
    if (!job) return;

    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== "candidate") {
      setError("Only candidates can apply for jobs.");
      return;
    }

    if (alreadyApplied) {
      setError(
        "You have already applied for this position."
      );
      return;
    }

    setApplying(true);

    /*
     * IMPORTANT:
     * Your database accepts "applied", not "submitted".
     */
    const { error: applicationError } =
      await supabase.from("applications").insert({
        candidate_id: user.id,
        job_id: job.id,
        status: "applied",
      });

    if (applicationError) {
      console.error(applicationError);

      const message =
        applicationError.message.toLowerCase();

      if (
        message.includes("duplicate") ||
        message.includes("unique")
      ) {
        setAlreadyApplied(true);
        setError(
          "You have already applied for this position."
        );
      } else {
        setError(applicationError.message);
      }

      setApplying(false);
      return;
    }

    setAlreadyApplied(true);
    setSuccess(
      "Application submitted successfully."
    );
    setApplying(false);
  }

  /*
   * Loading state
   */
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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/candidate/jobs"
              className="flex items-center gap-2.5"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BriefcaseBusiness size={18} />
              </div>

              <span className="text-sm font-bold">
                RMS
              </span>
            </Link>

            <button
              type="button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex size-10 items-center justify-center rounded-full border ${
                darkMode
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-slate-200 bg-white text-slate-700"
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
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />

          <div className="mt-6 h-64 animate-pulse rounded-3xl bg-slate-200" />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200" />

            <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * Error state
   */
  if (error && !job) {
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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/candidate/jobs"
              className="flex items-center gap-2.5"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BriefcaseBusiness size={18} />
              </div>

              <span className="text-sm font-bold">
                RMS
              </span>
            </Link>

            <button
              type="button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex size-10 items-center justify-center rounded-full border ${
                darkMode
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-slate-200 bg-white text-slate-700"
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
        </header>

        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5">
          <div
            className={`w-full rounded-3xl border p-8 text-center shadow-xl ${
              darkMode
                ? "border-red-500/20 bg-white/[0.05]"
                : "border-red-200 bg-white"
            }`}
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <BriefcaseBusiness size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Job unavailable
            </h1>

            <p
              className={`mt-2 text-sm ${
                darkMode
                  ? "text-slate-300"
                  : "text-slate-600"
              }`}
            >
              {error}
            </p>

            <Link
              href="/candidate/jobs"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <ArrowLeft size={16} />
              Browse jobs
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!job) return null;

  return (
    <main
      className={`min-h-dvh overflow-x-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#070a10] text-white"
          : "bg-[#f4f7fb] text-slate-900"
      }`}
    >
      {/* Background glow */}
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[650px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode
            ? "bg-cyan-950/20"
            : "bg-cyan-100/50"
        }`}
      />

      {/* Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200/80 bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/candidate/jobs"
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
              href="/candidate/jobs"
              className={`hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition sm:flex ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <ArrowLeft size={16} />
              All jobs
            </Link>

            <button
              type="button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex size-10 items-center justify-center rounded-full border shadow-sm transition ${
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

      {/* Page */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-12 lg:px-8">
        {/* Back */}
        <Link
          href="/candidate/jobs"
          className={`mb-5 inline-flex items-center gap-2 text-sm font-medium transition sm:mb-7 ${
            darkMode
              ? "text-slate-300 hover:text-white"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <ArrowLeft size={17} />
          Back to job listings
        </Link>

        {/* Hero */}
        <section
          className={`overflow-hidden rounded-3xl border shadow-xl ${
            darkMode
              ? "border-white/10 bg-white/[0.05] shadow-black/20"
              : "border-slate-200 bg-white shadow-slate-200/60"
          }`}
        >
          <div className="p-5 sm:p-7 lg:p-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
              {/* Job identity */}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 gap-4">
                  {/* Logo */}
                  <div
                    className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border sm:size-16 ${
                      darkMode
                        ? "border-white/10 bg-white/10"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {job.company?.logo_url ? (
                      <img
                        src={job.company.logo_url}
                        alt={job.company.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2
                        size={25}
                        className={
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Actively hiring
                      </span>

                      {job.experience_level && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            darkMode
                              ? "bg-white/10 text-slate-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {formatExperience(
                            job.experience_level
                          )}
                        </span>
                      )}
                    </div>

                    <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                      {job.title}
                    </h1>

                    <div
                      className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${
                        darkMode
                          ? "text-slate-300"
                          : "text-slate-600"
                      }`}
                    >
                      {job.company && (
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Building2 size={15} />
                          {job.company.name}
                        </span>
                      )}

                      {job.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={15} />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop apply */}
              <div className="w-full shrink-0 lg:w-auto">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={
                    applying || alreadyApplied
                  }
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold shadow-lg transition sm:w-auto ${
                    alreadyApplied
                      ? "cursor-default bg-emerald-500/10 text-emerald-700 shadow-none dark:text-emerald-400"
                      : "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  }`}
                >
                  {alreadyApplied ? (
                    <>
                      <CheckCircle2 size={17} />
                      Applied
                    </>
                  ) : applying ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send size={17} />
                      Apply now
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4">
              {/* Employment */}
              <div
                className={`rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <BriefcaseBusiness
                  size={17}
                  className={
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }
                />

                <p
                  className={`mt-3 text-[11px] font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Employment
                </p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {formatEmploymentType(
                    job.employment_type
                  )}
                </p>
              </div>

              {/* Experience */}
              <div
                className={`rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Users
                  size={17}
                  className={
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }
                />

                <p
                  className={`mt-3 text-[11px] font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Experience
                </p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {formatExperience(
                    job.experience_level
                  )}
                </p>
              </div>

              {/* Salary */}
              <div
                className={`rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <FileText
                  size={17}
                  className={
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }
                />

                <p
                  className={`mt-3 text-[11px] font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Salary
                </p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {formatSalary(
                    job.salary_min,
                    job.salary_max
                  )}
                </p>
              </div>

              {/* Deadline */}
              <div
                className={`rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <CalendarDays
                  size={17}
                  className={
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }
                />

                <p
                  className={`mt-3 text-[11px] font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Deadline
                </p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {formatDate(
                    job.application_deadline
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {(error || success) && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
              error
                ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {error || success}
          </div>
        )}

        {/* Main content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Details */}
          <div className="min-w-0 space-y-6">
            {/* Description */}
            <section
              className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h2 className="text-xl font-bold">
                About the role
              </h2>

              <div
                className={`mt-5 whitespace-pre-line text-sm leading-7 ${
                  darkMode
                    ? "text-slate-300"
                    : "text-slate-700"
                }`}
              >
                {job.description}
              </div>
            </section>

            {/* Responsibilities */}
            {job.responsibilities && (
              <section
                className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h2 className="text-xl font-bold">
                  Responsibilities
                </h2>

                <div
                  className={`mt-5 whitespace-pre-line text-sm leading-7 ${
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-700"
                  }`}
                >
                  {job.responsibilities}
                </div>
              </section>
            )}

            {/* Requirements */}
            {job.requirements && (
              <section
                className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h2 className="text-xl font-bold">
                  Requirements
                </h2>

                <div
                  className={`mt-5 whitespace-pre-line text-sm leading-7 ${
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-700"
                  }`}
                >
                  {job.requirements}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="min-w-0 space-y-6">
            {/* Job overview */}
            <section
              className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h2 className="font-bold">
                Job overview
              </h2>

              <div className="mt-5 space-y-5">
                {/* Location */}
                <div className="flex gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      darkMode
                        ? "bg-white/10 text-slate-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <MapPin size={16} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Location
                    </p>

                    <p className="mt-1 break-words text-sm font-medium">
                      {job.location ||
                        "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Employment */}
                <div className="flex gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      darkMode
                        ? "bg-white/10 text-slate-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Clock3 size={16} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Employment type
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatEmploymentType(
                        job.employment_type
                      )}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      darkMode
                        ? "bg-white/10 text-slate-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <CalendarDays size={16} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Application deadline
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDate(
                        job.application_deadline
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Company */}
            {job.company && (
              <section
                className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
                      darkMode
                        ? "border-white/10 bg-white/10"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {job.company.logo_url ? (
                      <img
                        src={job.company.logo_url}
                        alt={job.company.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2
                        size={19}
                        className={
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Company
                    </p>

                    <h2 className="truncate font-bold">
                      {job.company.name}
                    </h2>
                  </div>
                </div>

                {job.company.industry && (
                  <p
                    className={`mt-4 text-sm font-medium ${
                      darkMode
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {job.company.industry}
                  </p>
                )}

                {job.company.location && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-sm ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    <MapPin size={14} />
                    {job.company.location}
                  </p>
                )}

                {job.company.description && (
                  <p
                    className={`mt-4 text-sm leading-6 ${
                      darkMode
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {job.company.description}
                  </p>
                )}

                {job.company.website_url && (
                  <a
                    href={job.company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-5 flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                      darkMode
                        ? "border-white/10 text-slate-200 hover:bg-white/10"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    Company website
                    <ExternalLink size={14} />
                  </a>
                )}
              </section>
            )}

            {/* Security notice */}
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
                    Safe application
                  </h3>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    Your application information is
                    securely stored and only shared
                    with authorized recruiters.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Mobile sticky application bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-xl lg:hidden ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || alreadyApplied}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-lg ${
            alreadyApplied
              ? "bg-emerald-500 text-white"
              : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          }`}
        >
          {alreadyApplied ? (
            <>
              <CheckCircle2 size={17} />
              Application submitted
            </>
          ) : applying ? (
            "Submitting..."
          ) : (
            <>
              <Send size={17} />
              Apply for this position
            </>
          )}
        </button>
      </div>
    </main>
  );
}

