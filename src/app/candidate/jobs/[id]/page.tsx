"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Moon,
  Send,
  Sun,
  UserRound,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  employment_type: string;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  application_deadline: string | null;
  status: string;
  created_at: string;
};

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function formatEmploymentType(value: string | null) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExperience(value: string | null) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSalary(min: number | null, max: number | null) {
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
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getStatusClasses(status: string, darkMode: boolean) {
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

export default function CandidateJobDetailsPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const supabase = createClient();

  const rawId = params?.id;

  const routeJobId: string | undefined =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? rawId[0]
        : undefined;

  const [job, setJob] = useState<Job | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!routeJobId) {
      setLoading(false);
      setError("Job ID is missing.");
      return;
    }

    async function loadJob(jobId: string) {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name,email,phone")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile(profileData as Profile);
        }

        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `
              id,
              title,
              description,
              location,
              employment_type,
              experience_level,
              salary_min,
              salary_max,
              application_deadline,
              status,
              created_at
            `,
          )
          .eq("id", jobId)
          .maybeSingle();

        if (jobError) throw jobError;

        if (!jobData) {
          setJob(null);
          setApplication(null);
          setError("This job could not be found.");
          return;
        }

        setJob(jobData as Job);

        const { data: applicationData, error: applicationError } =
          await supabase
            .from("applications")
            .select(
              `
                id,
                job_id,
                candidate_id,
                status,
                applied_at,
                updated_at
              `,
            )
            .eq("job_id", jobId)
            .eq("candidate_id", user.id)
            .maybeSingle();

        if (applicationError) throw applicationError;

        setApplication(applicationData as Application | null);
      } catch (err) {
        console.error(err);
        setError("Unable to load this job. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadJob(routeJobId);
  }, [routeJobId, router, supabase]);

  async function handleApply() {
    if (!routeJobId) {
      setError("Job ID is missing.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: existingApplication, error: existingError } =
        await supabase
          .from("applications")
          .select(
            `
              id,
              job_id,
              candidate_id,
              status,
              applied_at,
              updated_at
            `,
          )
          .eq("job_id", routeJobId)
          .eq("candidate_id", user.id)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingApplication) {
        if (existingApplication.status === "withdrawn") {
          await handleReapplyInternal(existingApplication.id);
        } else {
          setApplication(existingApplication as Application);
        }
        return;
      }

      const { data: newApplication, error: insertError } = await supabase
        .from("applications")
        .insert({
          job_id: routeJobId,
          candidate_id: user.id,
          status: "applied",
        })
        .select(
          `
            id,
            job_id,
            candidate_id,
            status,
            applied_at,
            updated_at
          `,
        )
        .single();

      if (insertError) throw insertError;

      setApplication(newApplication as Application);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your application.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReapplyInternal(applicationId: string) {
    const { data, error: rpcError } = await supabase.rpc(
      "candidate_change_application_status",
      {
        p_application_id: applicationId,
        p_new_status: "applied",
      },
    );

    if (rpcError) throw rpcError;

    if (!data) {
      throw new Error("The application could not be updated.");
    }

    setApplication(data as Application);
  }

  async function handleReapply() {
    if (!application || application.status !== "withdrawn") {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await handleReapplyInternal(application.id);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reapply for this job.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!application) return;

    if (
      application.status === "withdrawn" ||
      application.status === "rejected" ||
      application.status === "hired"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to withdraw your application? You will be able to reapply later.",
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "candidate_change_application_status",
        {
          p_application_id: application.id,
          p_new_status: "withdrawn",
        },
      );

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error("The application could not be withdrawn.");
      }

      setApplication(data as Application);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to withdraw your application.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main
        className={`min-h-dvh ${
          darkMode
            ? "bg-[#080b12] text-white"
            : "bg-[#f6f9fc] text-slate-900"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div
            className={`h-10 w-32 animate-pulse rounded-xl ${
              darkMode ? "bg-white/10" : "bg-slate-200"
            }`}
          />
          <div
            className={`mt-6 h-[500px] animate-pulse rounded-3xl ${
              darkMode ? "bg-white/10" : "bg-slate-200"
            }`}
          />
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main
        className={`min-h-dvh ${
          darkMode
            ? "bg-[#080b12] text-white"
            : "bg-[#f6f9fc] text-slate-900"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <XCircle size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-bold">Job unavailable</h1>

          <p
            className={`mt-2 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {error || "This job is unavailable."}
          </p>

          <Link
            href="/candidate/jobs"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            <ArrowLeft size={16} />
            Browse jobs
          </Link>
        </div>
      </main>
    );
  }

  const isWithdrawn = application?.status === "withdrawn";
  const hasApplication = application !== null;

  const canWithdraw =
    hasApplication &&
    !isWithdrawn &&
    application.status !== "rejected" &&
    application.status !== "hired";

  return (
    <main
      className={`min-h-dvh overflow-x-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#080b12] text-white"
          : "bg-[#f6f9fc] text-slate-900"
      }`}
    >
      <button
        type="button"
        onClick={() => setDarkMode((value) => !value)}
        className={`fixed right-5 top-5 z-50 flex size-10 items-center justify-center rounded-full border shadow-lg backdrop-blur ${
          darkMode
            ? "border-white/10 bg-white/10 text-white"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/candidate/jobs"
          className={`inline-flex items-center gap-2 text-sm font-semibold ${
            darkMode
              ? "text-slate-400 hover:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ArrowLeft size={16} />
          Back to jobs
        </Link>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <section
          className={`mt-6 rounded-3xl border p-6 shadow-sm sm:p-8 ${
            darkMode
              ? "border-white/10 bg-white/[0.04]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${
                  darkMode ? "bg-white/10" : "bg-slate-100"
                }`}
              >
                <Building2 size={25} />
              </div>

              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  {job.title}
                </h1>

                <p
                  className={`mt-1 text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Recruitment Management System
                </p>
              </div>
            </div>

            {application && (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                  application.status,
                  darkMode,
                )}`}
              >
                {application.status === "withdrawn" ? (
                  <XCircle size={14} />
                ) : application.status === "selected" ||
                  application.status === "hired" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Clock3 size={14} />
                )}

                {getStatusLabel(application.status)}
              </span>
            )}
          </div>

          <div
            className={`mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {job.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {job.location}
              </div>
            )}

            <div className="flex items-center gap-2">
              <BriefcaseBusiness size={16} />
              {formatEmploymentType(job.employment_type)}
            </div>

            <div className="flex items-center gap-2">
              <UserRound size={16} />
              {formatExperience(job.experience_level)}
            </div>

            <div className="flex items-center gap-2">
              <Clock3 size={16} />
              Posted {formatDate(job.created_at)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-2xl p-4 ${
                darkMode ? "bg-white/[0.04]" : "bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-500">Salary</p>
              <p className="mt-1 text-sm font-bold">
                {formatSalary(job.salary_min, job.salary_max)}
              </p>
            </div>

            <div
              className={`rounded-2xl p-4 ${
                darkMode ? "bg-white/[0.04]" : "bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-500">Application deadline</p>
              <p className="mt-1 text-sm font-bold">
                {formatDate(job.application_deadline)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${
              darkMode
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={19} />
              <h2 className="text-lg font-bold">Job description</h2>
            </div>

            <div
              className={`mt-5 whitespace-pre-wrap text-sm leading-7 ${
                darkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {job.description}
            </div>
          </section>

          <aside
            className={`h-fit rounded-3xl border p-5 shadow-sm sm:p-6 lg:sticky lg:top-6 ${
              darkMode
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-white"
            }`}
          >
            <h2 className="font-bold">Your application</h2>

            {profile && (
              <div className="mt-4">
                <p className="text-sm font-semibold">
                  {profile.full_name || profile.email || "Candidate"}
                </p>

                {profile.email && (
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {profile.email}
                  </p>
                )}
              </div>
            )}

            {!application && (
              <>
                <div
                  className={`mt-5 rounded-2xl p-4 ${
                    darkMode ? "bg-white/[0.04]" : "bg-slate-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <Send
                      size={18}
                      className="mt-0.5 shrink-0 text-cyan-600"
                    />
                    <p
                      className={`text-xs leading-5 ${
                        darkMode ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      You have not applied for this position yet.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={actionLoading}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Send size={17} />
                  {actionLoading ? "Applying..." : "Apply now"}
                </button>
              </>
            )}

            {isWithdrawn && (
              <>
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-400/20 dark:bg-red-400/10">
                  <div className="flex gap-3">
                    <XCircle
                      className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                      size={19}
                    />
                    <div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">
                        Application withdrawn
                      </p>
                      <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-400/80">
                        You withdrew your application for this position. You
                        can reapply if you want to be considered again.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReapply}
                  disabled={actionLoading}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={17} />
                  {actionLoading ? "Reapplying..." : "Reapply"}
                </button>
              </>
            )}

            {application &&
              !isWithdrawn &&
              application.status !== "rejected" &&
              application.status !== "hired" && (
                <>
                  <div
                    className={`mt-5 rounded-2xl p-4 ${
                      darkMode ? "bg-emerald-400/10" : "bg-emerald-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      />
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          Application submitted
                        </p>
                        <p
                          className={`mt-1 text-xs leading-5 ${
                            darkMode
                              ? "text-emerald-400/70"
                              : "text-emerald-700/70"
                          }`}
                        >
                          Your application is currently {" "}
                          {getStatusLabel(application.status).toLowerCase()}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {canWithdraw && (
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={actionLoading}
                      className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        darkMode
                          ? "border-red-400/20 text-red-400 hover:bg-red-400/10"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <XCircle size={16} />
                      {actionLoading
                        ? "Processing..."
                        : "Withdraw application"}
                    </button>
                  )}
                </>
              )}

            {application?.status === "rejected" && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-400/20 dark:bg-red-400/10">
                <div className="flex gap-3">
                  <XCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">
                      Application rejected
                    </p>
                    <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-400/80">
                      Your application for this position has been rejected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {application?.status === "hired" && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                <div className="flex gap-3">
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      Hired
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700/70 dark:text-emerald-400/70">
                      Congratulations! You have been hired for this position.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}