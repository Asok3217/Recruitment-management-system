"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronRight,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  CalendarDays,
  BriefcaseBusiness,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import ApplicationDetailsModal from "@/components/recruiter/ApplicationDetailsModal";

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
  applied_at: string;
  updated_at: string;
  status: ApplicationStatus;
  candidate_id: string;
  job_id: string;
  cover_letter: string | null;
  resume_url: string | null;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  job: {
    id: string;
    title: string;
    company_name: string | null;
    location: string | null;
    employment_type: string;
  } | null;
};

const statusOptions: {
  value: ApplicationStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All applications" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "selected", label: "Selected" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const statusStyles: Record<ApplicationStatus, string> = {
  applied:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  screening:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  shortlisted:
    "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  interview:
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  selected:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  rejected:
    "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  withdrawn:
    "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
  offer_sent:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  hired:
    "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
};

function formatStatus(status: ApplicationStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function RecruiterApplicationsPage() {
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all");

  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [error, setError] = useState("");

  async function loadApplications(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const { data, error: queryError } = await supabase
        .from("applications")
        .select(
          `
          id,
          applied_at,
          updated_at,
          status,
          candidate_id,
          job_id,
          cover_letter,
          resume_url,

          candidate:profiles!applications_candidate_id_fkey(
            id,
            full_name,
            email,
            phone,
            avatar_url
          ),

          job:jobs!applications_job_id_fkey(
            id,
            title,
            company_name,
            location,
            employment_type
          )
        `
        )
        .order("applied_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setApplications((data ?? []) as Application[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return applications.filter((application) => {
      const candidateName =
        application.candidate?.full_name?.toLowerCase() ?? "";

      const candidateEmail =
        application.candidate?.email?.toLowerCase() ?? "";

      const jobTitle =
        application.job?.title?.toLowerCase() ?? "";

      const matchesSearch =
        !normalizedSearch ||
        candidateName.includes(normalizedSearch) ||
        candidateEmail.includes(normalizedSearch) ||
        jobTitle.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  const statistics = useMemo(() => {
    return {
      total: applications.length,

      pending: applications.filter(
        (application) =>
          application.status === "applied" ||
          application.status === "screening"
      ).length,

      interviews: applications.filter(
        (application) => application.status === "interview"
      ).length,

      hired: applications.filter(
        (application) => application.status === "hired"
      ).length,
    };
  }, [applications]);

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-[#080b12] dark:text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <BriefcaseBusiness size={16} />
              <span>Recruiter</span>
              <ChevronRight size={14} />
              <span>Applications</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Applications
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review and manage candidates throughout the recruitment process.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadApplications(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Statistics */}
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total applications"
            value={statistics.total}
            icon={<Users size={19} />}
          />

          <StatCard
            label="Needs review"
            value={statistics.pending}
            icon={<Clock3 size={19} />}
          />

          <StatCard
            label="Interviews"
            value={statistics.interviews}
            icon={<CalendarDays size={19} />}
          />

          <StatCard
            label="Hired"
            value={statistics.hired}
            icon={<CheckCircle2 size={19} />}
          />
        </section>

        {/* Main card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">

            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidate or job..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:bg-white/[0.06]"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter
                size={17}
                className="text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as ApplicationStatus | "all"
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                <Loader2
                  size={28}
                  className="animate-spin"
                />
                <p className="text-sm">
                  Loading applications...
                </p>
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              search={search}
              statusFilter={statusFilter}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                      <th className="px-5 py-4">
                        Candidate
                      </th>

                      <th className="px-5 py-4">
                        Position
                      </th>

                      <th className="px-5 py-4">
                        Applied
                      </th>

                      <th className="px-5 py-4">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr
                        key={application.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-white/[0.06] dark:hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <CandidateCell
                            application={application}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {application.job?.title ??
                                "Unknown position"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {application.job?.location ??
                                "Location not specified"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(application.applied_at)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={application.status}
                          />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedApplication(application)
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08]"
                          >
                            View
                            <ChevronRight size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / tablet cards */}
              <div className="divide-y divide-slate-100 lg:hidden dark:divide-white/[0.06]">
                {filteredApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() =>
                      setSelectedApplication(application)
                    }
                    className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <CandidateAvatar
                      application={application}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate font-semibold">
                          {application.candidate?.full_name ??
                            "Unknown candidate"}
                        </p>

                        <StatusBadge
                          status={application.status}
                        />
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {application.job?.title ??
                          "Unknown position"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Applied {formatDate(application.applied_at)}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400"
                    />
                  </button>
                ))}
              </div>

              {/* Result count */}
              <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                Showing {filteredApplications.length} of{" "}
                {applications.length} applications
              </div>
            </>
          )}
        </section>
      </div>

      {/* Details modal */}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onUpdated={(updatedApplication) => {
            setApplications((current) =>
              current.map((application) =>
                application.id === updatedApplication.id
                  ? {
                      ...application,
                      ...updatedApplication,
                    }
                  : application
              )
            );

            setSelectedApplication((current) =>
              current
                ? {
                    ...current,
                    ...updatedApplication,
                  }
                : null
            );
          }}
        />
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
      <div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-slate-200">
        {icon}
      </div>

      <p className="text-2xl font-bold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

function CandidateAvatar({
  application,
}: {
  application: Application;
}) {
  const candidate = application.candidate;

  if (candidate?.avatar_url) {
    return (
      <img
        src={candidate.avatar_url}
        alt={candidate.full_name}
        className="size-11 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
      {getInitials(candidate?.full_name ?? "Candidate")}
    </div>
  );
}

function CandidateCell({
  application,
}: {
  application: Application;
}) {
  const candidate = application.candidate;

  return (
    <div className="flex items-center gap-3">
      <CandidateAvatar application={application} />

      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-white">
          {candidate?.full_name ?? "Unknown candidate"}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {candidate?.email ?? "No email"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({
  search,
  statusFilter,
}: {
  search: string;
  statusFilter: ApplicationStatus | "all";
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
        {search || statusFilter !== "all" ? (
          <Search size={25} />
        ) : (
          <Users size={25} />
        )}
      </div>

      <h3 className="text-base font-semibold">
        {search || statusFilter !== "all"
          ? "No matching applications"
          : "No applications yet"}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {search || statusFilter !== "all"
          ? "Try changing your search or status filter."
          : "Applications submitted by candidates will appear here."}
      </p>
    </div>
  );
}