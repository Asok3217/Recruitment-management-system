"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Moon,
  Search,
  Send,
  Sparkles,
  Sun,
  UserRound,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
};

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  job: {
    id: string;
    title: string;
    company_name: string | null;
    location: string | null;
    employment_type:
      | "full_time"
      | "part_time"
      | "contract"
      | "internship"
      | string;
    experience_level:
      | "entry"
      | "mid"
      | "senior"
      | "lead"
      | "executive"
      | string
      | null;
  } | null;
};

type Job = {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  employment_type:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | string;
  experience_level:
    | "entry"
    | "mid"
    | "senior"
    | "lead"
    | "executive"
    | string
    | null;
  salary_min: number | null;
  salary_max: number | null;
  application_deadline: string | null;
  status: string;
  created_at: string;
};

function formatEmploymentType(value: string | null | undefined) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExperience(value: string | null | undefined) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
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

function formatDate(date: string | null | undefined) {
  if (!date) return "Not specified";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case "applied":
      return "Applied";

    case "screening":
      return "Screening";

    case "shortlisted":
      return "Shortlisted";

    case "interview":
      return "Interview";

    case "selected":
      return "Selected";

    case "offer_sent":
      return "Offer Sent";

    case "hired":
      return "Hired";

    case "rejected":
      return "Rejected";

    case "withdrawn":
      return "Withdrawn";

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
  }
}

function getStatusClasses(
  status: string,
  darkMode: boolean
) {
  if (status === "selected" || status === "hired") {
    return darkMode
      ? "bg-emerald-400/10 text-emerald-400"
      : "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "shortlisted" ||
    status === "interview" ||
    status === "offer_sent"
  ) {
    return darkMode
      ? "bg-blue-400/10 text-blue-400"
      : "bg-blue-50 text-blue-700";
  }

  if (status === "rejected" || status === "withdrawn") {
    return darkMode
      ? "bg-red-400/10 text-red-400"
      : "bg-red-50 text-red-700";
  }

  if (status === "screening") {
    return darkMode
      ? "bg-amber-400/10 text-amber-400"
      : "bg-amber-50 text-amber-700";
  }

  return darkMode
    ? "bg-slate-400/10 text-slate-300"
    : "bg-slate-100 text-slate-700";
}

function getInitials(name: string | null) {
  if (!name) return "C";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return (
    parts[0].slice(0, 1) +
    parts[parts.length - 1].slice(0, 1)
  ).toUpperCase();
}

export default function CandidateDashboardPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(
    null
  );

  const [applications, setApplications] = useState<
    Application[]
  >([]);

  const [jobs, setJobs] = useState<Job[]>([]);

  const [totalJobs, setTotalJobs] = useState(0);
  const [totalApplications, setTotalApplications] =
    useState(0);
  const [activeApplications, setActiveApplications] =
    useState(0);
  const [selectedApplications, setSelectedApplications] =
    useState(0);
  const [rejectedApplications, setRejectedApplications] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

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

        /*
         * ----------------------------------------------------
         * PROFILE
         * ----------------------------------------------------
         */
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              `
              id,
              full_name,
              email,
              phone,
              avatar_url,
              role,
              is_active
            `
            )
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Profile error:",
            profileError
          );
        }

        if (profileData) {
          setProfile(profileData as Profile);
        }

        /*
         * ----------------------------------------------------
         * PUBLISHED JOB COUNT
         * ----------------------------------------------------
         */
        const { count: jobsCount, error: jobsCountError } =
          await supabase
            .from("jobs")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "published");

        if (jobsCountError) {
          console.error(
            "Jobs count error:",
            jobsCountError
          );
        }

        setTotalJobs(jobsCount ?? 0);

        /*
         * ----------------------------------------------------
         * APPLICATIONS
         * ----------------------------------------------------
         */
        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select(
            `
            id,
            job_id,
            candidate_id,
            status,
            applied_at,
            updated_at,
            jobs (
              id,
              title,
              company_name,
              location,
              employment_type,
              experience_level
            )
          `
          )
          .eq("candidate_id", user.id)
          .order("applied_at", {
            ascending: false,
          });

        if (applicationError) {
          console.error(
            "Applications error:",
            applicationError
          );
        }

        const normalizedApplications: Application[] =
          (applicationData ?? []).map((item: any) => ({
            id: item.id,
            job_id: item.job_id,
            candidate_id: item.candidate_id,
            status: item.status,
            applied_at: item.applied_at,
            updated_at: item.updated_at,
            job: Array.isArray(item.jobs)
              ? item.jobs[0] ?? null
              : item.jobs ?? null,
          }));

        setApplications(normalizedApplications);

        setTotalApplications(
          normalizedApplications.length
        );

        const activeCount =
          normalizedApplications.filter(
            (application) =>
              [
                "applied",
                "screening",
                "shortlisted",
                "interview",
                "offer_sent",
              ].includes(application.status)
          ).length;

        const selectedCount =
          normalizedApplications.filter(
            (application) =>
              ["selected", "hired"].includes(
                application.status
              )
          ).length;

        const rejectedCount =
          normalizedApplications.filter(
            (application) =>
              application.status === "rejected"
          ).length;

        setActiveApplications(activeCount);
        setSelectedApplications(selectedCount);
        setRejectedApplications(rejectedCount);

        /*
         * ----------------------------------------------------
         * RECENT PUBLISHED JOBS
         * ----------------------------------------------------
         */
        const {
          data: jobsData,
          error: jobsError,
        } = await supabase
          .from("jobs")
          .select(
            `
            id,
            title,
            company_name,
            location,
            employment_type,
            experience_level,
            salary_min,
            salary_max,
            application_deadline,
            status,
            created_at
          `
          )
          .eq("status", "published")
          .order("created_at", {
            ascending: false,
          })
          .limit(6);

        if (jobsError) {
          console.error(
            "Recent jobs error:",
            jobsError
          );
        }

        setJobs((jobsData ?? []) as Job[]);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load your dashboard. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const displayName =
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Candidate";

  const recentApplications = applications.slice(0, 5);

  return (
    <main
      className={`min-h-dvh overflow-x-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#070a10] text-white"
          : "bg-[#f4f7fb] text-slate-950"
      }`}
    >
      {/* Background */}
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode
            ? "bg-cyan-950/20"
            : "bg-cyan-100/50"
        }`}
      />

      {/* Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#070a10]/90"
            : "border-slate-200/80 bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/candidate/dashboard"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                darkMode
                  ? "bg-white/10 text-white"
                  : "bg-slate-100 text-slate-950"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/candidate/jobs"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              Find jobs
            </Link>

            <Link
              href="/candidate/applications"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              Applications
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/candidate/applications"
              className={`hidden size-10 items-center justify-center rounded-full sm:flex ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-label="Applications"
            >
              <FileText size={18} />
            </Link>

            <button
              type="button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex size-10 items-center justify-center rounded-full border shadow-sm ${
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
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 pb-10 sm:px-6 sm:py-8 lg:px-8">
        {/* Loading */}
        {loading ? (
          <>
            <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
              <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
            </div>
          </>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Welcome */}
            <section
              className={`overflow-hidden rounded-3xl border shadow-xl ${
                darkMode
                  ? "border-white/10 bg-white/[0.05]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:p-8">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-16 ${
                      darkMode
                        ? "bg-white/10"
                        : "bg-slate-100"
                    }`}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {getInitials(displayName)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={16}
                        className="text-cyan-500"
                      />

                      <p
                        className={`text-sm font-medium ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        Candidate dashboard
                      </p>
                    </div>

                    <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                      Welcome back, {displayName}
                    </h1>

                    <p
                      className={`mt-1 text-sm ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      Keep track of your applications
                      and discover your next opportunity.
                    </p>
                  </div>
                </div>

                <Link
                  href="/candidate/jobs"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Search size={17} />
                  Find jobs
                </Link>
              </div>
            </section>

            {/* Statistics */}
            <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {/* Jobs */}
              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-blue-400/10 text-blue-400"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <BriefcaseBusiness size={19} />
                </div>

                <p
                  className={`mt-4 text-xs font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Available jobs
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalJobs}
                </p>
              </div>

              {/* Applications */}
              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-cyan-400/10 text-cyan-400"
                      : "bg-cyan-50 text-cyan-700"
                  }`}
                >
                  <Send size={19} />
                </div>

                <p
                  className={`mt-4 text-xs font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Applications
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalApplications}
                </p>
              </div>

              {/* Active */}
              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Clock3 size={19} />
                </div>

                <p
                  className={`mt-4 text-xs font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  In progress
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {activeApplications}
                </p>
              </div>

              {/* Selected */}
              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <CheckCircle2 size={19} />
                </div>

                <p
                  className={`mt-4 text-xs font-medium ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Selected
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {selectedApplications}
                </p>
              </div>
            </section>

            {/* Main columns */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Recent Applications */}
              <section
                className={`min-w-0 rounded-3xl border shadow-sm ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between border-b border-inherit p-5 sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold">
                      Recent applications
                    </h2>

                    <p
                      className={`mt-1 text-sm ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Track your latest job applications.
                    </p>
                  </div>

                  <Link
                    href="/candidate/applications"
                    className={`hidden items-center gap-1 text-sm font-semibold sm:flex ${
                      darkMode
                        ? "text-cyan-400"
                        : "text-cyan-700"
                    }`}
                  >
                    View all
                    <ArrowRight size={15} />
                  </Link>
                </div>

                {recentApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                    <div
                      className={`flex size-14 items-center justify-center rounded-2xl ${
                        darkMode
                          ? "bg-white/10"
                          : "bg-slate-100"
                      }`}
                    >
                      <FileText
                        size={24}
                        className={
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }
                      />
                    </div>

                    <h3 className="mt-4 font-bold">
                      No applications yet
                    </h3>

                    <p
                      className={`mt-1 max-w-sm text-sm ${
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      Start exploring available jobs and
                      submit your first application.
                    </p>

                    <Link
                      href="/candidate/jobs"
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                    >
                      Browse jobs
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-white/10">
                    {recentApplications.map(
                      (application) => (
                        <Link
                          key={application.id}
                          href={`/candidate/applications/${application.id}`}
                          className={`block p-5 transition sm:p-6 ${
                            darkMode
                              ? "hover:bg-white/[0.03]"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <div
                                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                                  darkMode
                                    ? "bg-white/10"
                                    : "bg-slate-100"
                                }`}
                              >
                                <BriefcaseBusiness
                                  size={18}
                                />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold sm:text-base">
                                  {application.job
                                    ?.title ??
                                    "Job position"}
                                </h3>

                                <div
                                  className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${
                                    darkMode
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  <span>
                                    {application.job
                                      ?.company_name ??
                                      "Company"}
                                  </span>

                                  {application.job
                                    ?.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin
                                        size={12}
                                      />
                                      {
                                        application.job
                                          .location
                                      }
                                    </span>
                                  )}
                                </div>

                                <p
                                  className={`mt-2 text-xs ${
                                    darkMode
                                      ? "text-slate-500"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Applied{" "}
                                  {formatDate(
                                    application.applied_at
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                  application.status,
                                  darkMode
                                )}`}
                              >
                                {getStatusLabel(
                                  application.status
                                )}
                              </span>

                              <ArrowRight
                                size={16}
                                className={
                                  darkMode
                                    ? "text-slate-500"
                                    : "text-slate-400"
                                }
                              />
                            </div>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                )}

                <div className="border-t border-slate-200 p-4 dark:border-white/10 sm:hidden">
                  <Link
                    href="/candidate/applications"
                    className={`flex items-center justify-center gap-2 text-sm font-semibold ${
                      darkMode
                        ? "text-cyan-400"
                        : "text-cyan-700"
                    }`}
                  >
                    View all applications
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </section>

              {/* Right column */}
              <div className="space-y-6">
                {/* Profile */}
                <section
                  className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">
                      Profile
                    </h2>

                    <UserRound
                      size={18}
                      className={
                        darkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      }
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
                        darkMode
                          ? "bg-white/10"
                          : "bg-slate-100"
                      }`}
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="font-bold">
                          {getInitials(displayName)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {displayName}
                      </p>

                      <p
                        className={`truncate text-xs ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        {profile?.email ??
                          "Candidate account"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        Profile status
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          profile?.is_active
                            ? darkMode
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-emerald-50 text-emerald-700"
                            : darkMode
                              ? "bg-red-400/10 text-red-400"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {profile?.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Application summary */}
                <section
                  className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">
                      Application summary
                    </h2>

                    <Link
                      href="/candidate/applications"
                      className={`text-xs font-semibold ${
                        darkMode
                          ? "text-cyan-400"
                          : "text-cyan-700"
                      }`}
                    >
                      Details
                    </Link>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                          <Clock3 size={15} />
                        </div>

                        <span className="text-sm">
                          In progress
                        </span>
                      </div>

                      <span className="text-sm font-bold">
                        {activeApplications}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                          <CheckCircle2 size={15} />
                        </div>

                        <span className="text-sm">
                          Selected
                        </span>
                      </div>

                      <span className="text-sm font-bold">
                        {selectedApplications}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400">
                          <XCircle size={15} />
                        </div>

                        <span className="text-sm">
                          Rejected
                        </span>
                      </div>

                      <span className="text-sm font-bold">
                        {rejectedApplications}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Quick action */}
                <section
                  className={`rounded-3xl border p-5 ${
                    darkMode
                      ? "border-cyan-400/10 bg-cyan-400/[0.04]"
                      : "border-cyan-200 bg-cyan-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <Search
                      size={20}
                      className="shrink-0 text-cyan-700 dark:text-cyan-400"
                    />

                    <div>
                      <h3 className="text-sm font-semibold">
                        Looking for your next opportunity?
                      </h3>

                      <p
                        className={`mt-1 text-xs leading-5 ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-600"
                        }`}
                      >
                        Explore the latest published
                        positions and find a role that
                        matches your skills.
                      </p>

                      <Link
                        href="/candidate/jobs"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400"
                      >
                        Browse available jobs
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Latest Jobs */}
            <section
              className={`mt-6 rounded-3xl border shadow-sm ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold">
                    Latest opportunities
                  </h2>

                  <p
                    className={`mt-1 text-sm ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    Recently published jobs you may be
                    interested in.
                  </p>
                </div>

                <Link
                  href="/candidate/jobs"
                  className={`hidden items-center gap-1 text-sm font-semibold sm:flex ${
                    darkMode
                      ? "text-cyan-400"
                      : "text-cyan-700"
                  }`}
                >
                  View all
                  <ArrowRight size={15} />
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <BriefcaseBusiness
                    size={28}
                    className="mx-auto text-slate-400"
                  />

                  <p
                    className={`mt-3 text-sm ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    No published jobs are available right
                    now.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/candidate/jobs/${job.id}`}
                      className={`group rounded-2xl border p-5 transition ${
                        darkMode
                          ? "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                            darkMode
                              ? "bg-white/10"
                              : "bg-slate-100"
                          }`}
                        >
                          <BriefcaseBusiness
                            size={17}
                          />
                        </div>

                        <ArrowRight
                          size={17}
                          className={`transition group-hover:translate-x-0.5 ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-400"
                          }`}
                        />
                      </div>

                      <h3 className="mt-4 line-clamp-2 font-bold">
                        {job.title}
                      </h3>

                      <p
                        className={`mt-1 truncate text-sm font-medium ${
                          darkMode
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        {job.company_name ||
                          "Company not specified"}
                      </p>

                      <div
                        className={`mt-4 space-y-2 text-xs ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        {job.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={13} />
                            <span className="truncate">
                              {job.location}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <BriefcaseBusiness size={13} />
                          <span>
                            {formatEmploymentType(
                              job.employment_type
                            )}
                          </span>
                        </div>

                        {job.experience_level && (
                          <div className="flex items-center gap-2">
                            <UserRound size={13} />
                            <span>
                              {formatExperience(
                                job.experience_level
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        className={`mt-4 border-t pt-4 ${
                          darkMode
                            ? "border-white/10"
                            : "border-slate-200"
                        }`}
                      >
                        <p className="text-xs font-semibold">
                          {formatSalary(
                            job.salary_min,
                            job.salary_max
                          )}
                        </p>

                        {job.application_deadline && (
                          <p
                            className={`mt-1 text-[11px] ${
                              darkMode
                                ? "text-slate-500"
                                : "text-slate-500"
                            }`}
                          >
                            Deadline:{" "}
                            {formatDate(
                              job.application_deadline
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Mobile navigation */}
            <div
              className={`mt-6 grid grid-cols-3 gap-2 rounded-2xl border p-2 md:hidden ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Link
                href="/candidate/dashboard"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${
                  darkMode
                    ? "bg-white/10 text-white"
                    : "bg-slate-100 text-slate-950"
                }`}
              >
                <BriefcaseBusiness size={17} />
                Dashboard
              </Link>

              <Link
                href="/candidate/jobs"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${
                  darkMode
                    ? "text-slate-300"
                    : "text-slate-600"
                }`}
              >
                <Search size={17} />
                Jobs
              </Link>

              <Link
                href="/candidate/applications"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${
                  darkMode
                    ? "text-slate-300"
                    : "text-slate-600"
                }`}
              >
                <FileText size={17} />
                Applications
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}