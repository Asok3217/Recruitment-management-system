
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Moon,
  RotateCcw,
  Send,
  Sun,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ApplicationStatus =
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected"
  | "withdrawn"
  | "offer_sent"
  | "hired";

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_url: string | null;
  cover_letter: string | null;
  status: ApplicationStatus;
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
      | null;
    application_deadline: string | null;
  } | null;
};

function formatStatus(status: ApplicationStatus) {
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
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "offer_sent":
      return "Offer Sent";
    case "hired":
      return "Hired";
    default:
      return "Applied";
  }
}

function formatEmploymentType(
  value:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | null
) {
  if (!value) return "Not specified";

  return value
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(
  status: ApplicationStatus,
  darkMode: boolean
) {
  switch (status) {
    case "selected":
    case "hired":
      return darkMode
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":
      return darkMode
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-red-200 bg-red-50 text-red-700";

    case "withdrawn":
      return darkMode
        ? "border-slate-400/20 bg-slate-400/10 text-slate-300"
        : "border-slate-200 bg-slate-100 text-slate-600";

    case "interview":
    case "shortlisted":
      return darkMode
        ? "border-violet-400/20 bg-violet-400/10 text-violet-300"
        : "border-violet-200 bg-violet-50 text-violet-700";

    case "screening":
      return darkMode
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";

    case "offer_sent":
      return darkMode
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
        : "border-cyan-200 bg-cyan-50 text-cyan-700";

    default:
      return darkMode
        ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
        : "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function getStatusIcon(status: ApplicationStatus) {
  switch (status) {
    case "selected":
    case "hired":
      return <CheckCircle2 size={14} />;

    case "rejected":
      return <XCircle size={14} />;

    case "withdrawn":
      return <XCircle size={14} />;

    case "interview":
      return <CalendarDays size={14} />;

    case "screening":
      return <Clock3 size={14} />;

    default:
      return <Send size={14} />;
  }
}

function canWithdraw(status: ApplicationStatus) {
  return (
    status === "applied" ||
    status === "screening" ||
    status === "shortlisted"
  );
}

export default function CandidateApplicationsPage() {
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  async function loadApplications(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("Please sign in to view your applications.");
        setApplications([]);
        return;
      }

      const { data, error: applicationsError } = await supabase
        .from("applications")
        .select(
          `
          id,
          job_id,
          candidate_id,
          resume_url,
          cover_letter,
          status,
          applied_at,
          updated_at,
          jobs (
            id,
            title,
            company_name,
            location,
            employment_type,
            application_deadline
          )
        `
        )
        .eq("candidate_id", user.id)
        .order("applied_at", { ascending: false });

      if (applicationsError) {
        throw applicationsError;
      }

      const normalizedApplications: Application[] = (
        data ?? []
      ).map((item: any) => {
        const rawJob = Array.isArray(item.jobs)
          ? item.jobs[0] ?? null
          : item.jobs ?? null;

        return {
          id: item.id,
          job_id: item.job_id,
          candidate_id: item.candidate_id,
          resume_url: item.resume_url ?? null,
          cover_letter: item.cover_letter ?? null,
          status: item.status as ApplicationStatus,
          applied_at: item.applied_at,
          updated_at: item.updated_at,
          job: rawJob
            ? {
                id: rawJob.id,
                title: rawJob.title,
                company_name: rawJob.company_name ?? null,
                location: rawJob.location ?? null,
                employment_type:
                  rawJob.employment_type ?? null,
                application_deadline:
                  rawJob.application_deadline ?? null,
              }
            : null,
        };
      });

      setApplications(normalizedApplications);
    } catch (err) {
      console.error("Failed to load applications:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleWithdraw(application: Application) {
    if (!canWithdraw(application.status)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to withdraw this application?"
    );

    if (!confirmed) {
      return;
    }

    setWithdrawingId(application.id);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("applications")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id)
        .eq("candidate_id", application.candidate_id);

      if (updateError) {
        throw updateError;
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status: "withdrawn",
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      setSuccess("Application withdrawn successfully.");
    } catch (err) {
      console.error("Failed to withdraw application:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to withdraw the application."
      );
    } finally {
      setWithdrawingId(null);
    }
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
        

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />

          <div className="mt-3 h-5 w-80 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />

          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-48 animate-pulse rounded-3xl ${
                  darkMode
                    ? "bg-white/[0.05]"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
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
      {/* Background glow */}
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[650px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode
            ? "bg-cyan-950/20"
            : "bg-cyan-100/50"
        }`}
      />

 

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-7 pb-12 sm:px-6 sm:py-9 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={`text-sm font-semibold ${
                darkMode
                  ? "text-cyan-400"
                  : "text-cyan-700"
              }`}
            >
              Candidate portal
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              My applications
            </h1>

            <p
              className={`mt-2 max-w-2xl text-sm leading-6 sm:text-base ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-600"
              }`}
            >
              Track the jobs you have applied for and
              monitor the progress of each application.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadApplications(true)}
            disabled={refreshing}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              darkMode
                ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <RotateCcw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
              error
                ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {error || success}
          </div>
        )}

        {/* Empty state */}
        {applications.length === 0 && !error && (
          <section
            className={`mt-8 rounded-3xl border p-8 text-center shadow-sm sm:p-12 ${
              darkMode
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
                darkMode
                  ? "bg-white/10 text-slate-300"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <FileText size={27} />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              No applications yet
            </h2>

            <p
              className={`mx-auto mt-2 max-w-md text-sm leading-6 ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-600"
              }`}
            >
              You have not applied for any jobs yet.
              Browse available positions and submit your
              first application.
            </p>

            <Link
              href="/candidate/jobs"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <BriefcaseBusiness size={16} />
              Browse jobs
            </Link>
          </section>
        )}

        {/* Applications */}
        {applications.length > 0 && (
          <div className="mt-8 space-y-5">
            {applications.map((application) => {
              const job = application.job;
              const withdrawLoading =
                withdrawingId === application.id;

              return (
                <article
                  key={application.id}
                  className={`overflow-hidden rounded-3xl border shadow-sm transition ${
                    darkMode
                      ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.055]"
                      : "border-slate-200 bg-white hover:shadow-md"
                  }`}
                >
                  <div className="p-5 sm:p-6 lg:p-7">
                    {/* Top */}
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div
                          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                            darkMode
                              ? "bg-white/10 text-slate-300"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <BriefcaseBusiness size={21} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                application.status,
                                darkMode
                              )}`}
                            >
                              {getStatusIcon(
                                application.status
                              )}
                              {formatStatus(
                                application.status
                              )}
                            </span>
                          </div>

                          {job ? (
                            <>
                              <h2 className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">
                                {job.title}
                              </h2>

                              {job.company_name && (
                                <p
                                  className={`mt-1 text-sm font-medium ${
                                    darkMode
                                      ? "text-slate-300"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {job.company_name}
                                </p>
                              )}
                            </>
                          ) : (
                            <h2 className="mt-2 text-xl font-bold">
                              Job no longer available
                            </h2>
                          )}
                        </div>
                      </div>

                      {/* View job */}
                      {job && (
                        <Link
                          href={`/candidate/jobs/${job.id}`}
                          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                            darkMode
                              ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                        >
                          View job
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>

                    {/* Details */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div
                        className={`rounded-2xl border p-4 ${
                          darkMode
                            ? "border-white/10 bg-white/[0.025]"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <MapPin
                          size={16}
                          className={
                            darkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                          }
                        />

                        <p
                          className={`mt-2 text-[11px] font-medium ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          Location
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold">
                          {job?.location ||
                            "Not specified"}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          darkMode
                            ? "border-white/10 bg-white/[0.025]"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <BriefcaseBusiness
                          size={16}
                          className={
                            darkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                          }
                        />

                        <p
                          className={`mt-2 text-[11px] font-medium ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          Employment
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold">
                          {formatEmploymentType(
                            job?.employment_type ?? null
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          darkMode
                            ? "border-white/10 bg-white/[0.025]"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <CalendarDays
                          size={16}
                          className={
                            darkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                          }
                        />

                        <p
                          className={`mt-2 text-[11px] font-medium ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          Applied
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatDate(
                            application.applied_at
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          darkMode
                            ? "border-white/10 bg-white/[0.025]"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <Clock3
                          size={16}
                          className={
                            darkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                          }
                        />

                        <p
                          className={`mt-2 text-[11px] font-medium ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          Last updated
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatDate(
                            application.updated_at
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Submitted documents */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {application.resume_url && (
                        <a
                          href={application.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                            darkMode
                              ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <FileText size={15} />
                          View resume
                          <ExternalLink size={13} />
                        </a>
                      )}

                      {application.cover_letter && (
                        <button
                          type="button"
                          onClick={() =>
                            window.alert(
                              application.cover_letter ??
                                ""
                            )
                          }
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                            darkMode
                              ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <FileText size={15} />
                          View cover letter
                        </button>
                      )}

                      {!application.resume_url &&
                        !application.cover_letter && (
                          <p
                            className={`text-sm ${
                              darkMode
                                ? "text-slate-500"
                                : "text-slate-500"
                            }`}
                          >
                            No documents attached to this
                            application.
                          </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                      className={`mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${
                        darkMode
                          ? "border-white/10"
                          : "border-slate-100"
                      }`}
                    >
                      <div
                        className={`text-xs ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-500"
                        }`}
                      >
                        Application ID:{" "}
                        <span className="font-mono">
                          {application.id.slice(0, 8)}
                        </span>
                      </div>

                      {canWithdraw(
                        application.status
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleWithdraw(application)
                          }
                          disabled={withdrawLoading}
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                            darkMode
                              ? "border-red-400/20 bg-red-400/5 text-red-300 hover:bg-red-400/10"
                              : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {withdrawLoading ? (
                            <>
                              <RotateCcw
                                size={14}
                                className="animate-spin"
                              />
                              Withdrawing...
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              Withdraw application
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Browse more */}
        {applications.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/candidate/jobs"
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition ${
                darkMode
                  ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BriefcaseBusiness size={16} />
              Browse more jobs
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

