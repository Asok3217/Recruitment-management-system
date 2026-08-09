"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  MapPin,
  Moon,
  Search,
  Send,
  SlidersHorizontal,
  Sun,
  X,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Application = {
  id: string;
  applied_at: string;
  updated_at: string;
  status: string;
  cover_letter: string | null;
  resume_url: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    employment_type: string;
    experience_level: string | null;
    application_deadline: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
      industry: string | null;
    } | null;
  } | null;
};

type StatusFilter = "all" | string;

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

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusStyle(status: string, darkMode: boolean) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("reject") ||
    normalized.includes("declin")
  ) {
    return darkMode
      ? "bg-red-400/10 text-red-300 border-red-400/20"
      : "bg-red-50 text-red-700 border-red-200";
  }

  if (
    normalized.includes("offer") ||
    normalized.includes("accept")
  ) {
    return darkMode
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized.includes("interview") ||
    normalized.includes("shortlist")
  ) {
    return darkMode
      ? "bg-violet-400/10 text-violet-300 border-violet-400/20"
      : "bg-violet-50 text-violet-700 border-violet-200";
  }

  if (
    normalized.includes("review") ||
    normalized.includes("screen")
  ) {
    return darkMode
      ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
      : "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (normalized.includes("withdraw")) {
    return darkMode
      ? "bg-slate-400/10 text-slate-300 border-slate-400/20"
      : "bg-slate-100 text-slate-600 border-slate-200";
  }

  return darkMode
    ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/20"
    : "bg-cyan-50 text-cyan-700 border-cyan-200";
}

function getStatusIcon(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("offer") ||
    normalized.includes("accept")
  ) {
    return <CheckCircle2 size={14} />;
  }

  if (
    normalized.includes("interview") ||
    normalized.includes("shortlist")
  ) {
    return <Clock3 size={14} />;
  }

  if (normalized.includes("reject")) {
    return <X size={14} />;
  }

  return <FileText size={14} />;
}

export default function CandidateApplicationsPage() {
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [error, setError] = useState("");

  async function loadApplications() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please sign in to view your applications.");
      setLoading(false);
      return;
    }

    const { data, error: applicationsError } = await supabase
      .from("applications")
      .select(
        `
        id,
        applied_at,
        updated_at,
        status,
        cover_letter,
        resume_url,
        jobs (
          id,
          title,
          location,
          employment_type,
          experience_level,
          application_deadline,
          companies (
            id,
            name,
            logo_url,
            industry
          )
        )
      `
      )
      .eq("candidate_id", user.id)
      .order("applied_at", { ascending: false });

    if (applicationsError) {
      console.error(applicationsError);
      setError("Unable to load your applications.");
      setLoading(false);
      return;
    }

    const normalized: Application[] = (data ?? []).map(
      (item: any) => {
        const rawJob = Array.isArray(item.jobs)
          ? item.jobs[0] ?? null
          : item.jobs ?? null;

        const rawCompany = rawJob
          ? Array.isArray(rawJob.companies)
            ? rawJob.companies[0] ?? null
            : rawJob.companies ?? null
          : null;

        return {
          id: item.id,
          applied_at: item.applied_at,
          updated_at: item.updated_at,
          status: item.status,
          cover_letter: item.cover_letter,
          resume_url: item.resume_url,
          job: rawJob
            ? {
                id: rawJob.id,
                title: rawJob.title,
                location: rawJob.location,
                employment_type: rawJob.employment_type,
                experience_level: rawJob.experience_level,
                application_deadline:
                  rawJob.application_deadline,
                company: rawCompany
                  ? {
                      id: rawCompany.id,
                      name: rawCompany.name,
                      logo_url: rawCompany.logo_url,
                      industry: rawCompany.industry,
                    }
                  : null,
              }
            : null,
        };
      }
    );

    setApplications(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  const statuses = useMemo(() => {
    const unique = Array.from(
      new Set(applications.map((application) => application.status))
    );

    return unique.sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const job = application.job;

      if (!job) return false;

      const matchesStatus =
        statusFilter === "all" ||
        application.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      return (
        job.title.toLowerCase().includes(query) ||
        job.company?.name.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        application.status.toLowerCase().includes(query)
      );
    });
  }, [applications, search, statusFilter]);

  const stats = useMemo(() => {
    const total = applications.length;

    const active = applications.filter((application) => {
      const status = application.status.toLowerCase();

      return (
        !status.includes("reject") &&
        !status.includes("withdraw") &&
        !status.includes("offer")
      );
    }).length;

    const interviews = applications.filter((application) => {
      const status = application.status.toLowerCase();

      return (
        status.includes("interview") ||
        status.includes("shortlist")
      );
    }).length;

    const offers = applications.filter((application) => {
      const status = application.status.toLowerCase();

      return status.includes("offer") || status.includes("accept");
    }).length;

    return {
      total,
      active,
      interviews,
      offers,
    };
  }, [applications]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  const hasFilters =
    search.trim().length > 0 || statusFilter !== "all";

  return (
    <main
      className={`min-h-dvh transition-colors duration-300 ${
        darkMode
          ? "bg-[#070a10] text-white"
          : "bg-[#f5f8fc] text-slate-950"
      }`}
    >
      {/* Background glow */}
      <div
        className={`pointer-events-none fixed left-1/2 top-0 -z-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full blur-3xl ${
          darkMode
            ? "bg-cyan-950/20"
            : "bg-cyan-100/60"
        }`}
      />

      {/* Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#070a10]/80"
            : "border-slate-200 bg-white/85"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/candidate/dashboard"
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

            <span className="text-sm font-bold sm:text-base">
              RMS
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/candidate/dashboard"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                darkMode
                  ? "text-slate-400 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/candidate/jobs"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                darkMode
                  ? "text-slate-400 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              Find jobs
            </Link>

            <Link
              href="/candidate/applications"
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                darkMode
                  ? "bg-white/10 text-white"
                  : "bg-slate-100 text-slate-950"
              }`}
            >
              Applications
            </Link>

            <Link
              href="/candidate/profile"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                darkMode
                  ? "text-slate-400 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/candidate/jobs"
              className={`hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium sm:flex ${
                darkMode
                  ? "text-slate-300 hover:bg-white/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={16} />
              Find jobs
            </Link>

            <button
              type="button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex size-10 items-center justify-center rounded-full border transition ${
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

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Page heading */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                darkMode
                  ? "text-cyan-400"
                  : "text-cyan-700"
              }`}
            >
              Candidate portal
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              My applications
            </h1>

            <p
              className={`mt-2 max-w-2xl text-sm leading-6 sm:text-base ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-600"
              }`}
            >
              Track the jobs you've applied to and stay
              updated on your recruitment progress.
            </p>
          </div>

          <Link
            href="/candidate/jobs"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              darkMode
                ? "bg-white text-slate-900 hover:bg-slate-200"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            <Search size={16} />
            Find more jobs
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total applications"
            value={stats.total}
            icon={<Send size={18} />}
            darkMode={darkMode}
          />

          <StatCard
            label="In progress"
            value={stats.active}
            icon={<Clock3 size={18} />}
            darkMode={darkMode}
          />

          <StatCard
            label="Interview stage"
            value={stats.interviews}
            icon={<CalendarDays size={18} />}
            darkMode={darkMode}
          />

          <StatCard
            label="Offers"
            value={stats.offers}
            icon={<CheckCircle2 size={18} />}
            darkMode={darkMode}
          />
        </div>

        {/* Search/filter toolbar */}
        <section
          className={`mt-7 rounded-2xl border p-3 shadow-sm sm:p-4 ${
            darkMode
              ? "border-white/10 bg-white/[0.04]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by job title, company or location..."
                className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none transition ${
                  darkMode
                    ? "border-white/10 bg-white/[0.05] text-white placeholder:text-slate-500 focus:border-white/20"
                    : "border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                }`}
              />
            </div>

            <div className="hidden lg:block lg:w-56">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className={`h-12 w-full rounded-xl border px-3 text-sm font-medium outline-none ${
                  darkMode
                    ? "border-white/10 bg-[#0c1018] text-white"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                <option value="all">
                  All statuses
                </option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                setFiltersOpen((value) => !value)
              }
              className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold lg:hidden ${
                darkMode
                  ? "border-white/10 bg-white/[0.05] text-white"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              <SlidersHorizontal size={17} />
              Filters
            </button>
          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`text-xs ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-500"
                }`}
              >
                Active filters:
              </span>

              {statusFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                    darkMode
                      ? "border-white/10 bg-white/10 text-slate-200"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  {formatStatus(statusFilter)}
                  <X size={12} />
                </button>
              )}

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                    darkMode
                      ? "border-white/10 bg-white/10 text-slate-200"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className="max-w-40 truncate">
                    "{search}"
                  </span>
                  <X size={12} />
                </button>
              )}

              <button
                type="button"
                onClick={clearFilters}
                className={`text-xs font-semibold ${
                  darkMode
                    ? "text-cyan-400 hover:text-cyan-300"
                    : "text-cyan-700 hover:text-cyan-800"
                }`}
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Mobile filter panel */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 bg-black/50"
            />

            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-5 shadow-2xl ${
                darkMode
                  ? "bg-[#0b1018] text-white"
                  : "bg-white text-slate-950"
              }`}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter size={18} />
                  <h2 className="font-bold">
                    Filter applications
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className={`flex size-9 items-center justify-center rounded-full ${
                    darkMode
                      ? "bg-white/10"
                      : "bg-slate-100"
                  }`}
                >
                  <X size={17} />
                </button>
              </div>

              <label
                className={`mb-2 block text-xs font-semibold ${
                  darkMode
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                Application status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className={`h-12 w-full rounded-xl border px-3 text-sm font-medium outline-none ${
                  darkMode
                    ? "border-white/10 bg-white/[0.05] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-900"
                }`}
              >
                <option value="all">
                  All statuses
                </option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className={`mt-6 h-12 w-full rounded-xl text-sm font-semibold ${
                  darkMode
                    ? "bg-white text-slate-900"
                    : "bg-slate-900 text-white"
                }`}
              >
                Show {filteredApplications.length}{" "}
                {filteredApplications.length === 1
                  ? "application"
                  : "applications"}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <section className="mt-6">
          {loading ? (
            <LoadingState darkMode={darkMode} />
          ) : error ? (
            <ErrorState
              error={error}
              darkMode={darkMode}
              onRetry={loadApplications}
            />
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              hasApplications={applications.length > 0}
              darkMode={darkMode}
              clearFilters={clearFilters}
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p
                  className={`text-sm ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  Showing{" "}
                  <span className="font-semibold">
                    {filteredApplications.length}
                  </span>{" "}
                  {filteredApplications.length === 1
                    ? "application"
                    : "applications"}
                </p>
              </div>

              {/* Desktop list */}
              <div
                className={`hidden overflow-hidden rounded-3xl border shadow-sm md:block ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`grid grid-cols-[minmax(260px,1.5fr)_180px_150px_130px_100px] gap-4 border-b px-6 py-4 text-xs font-semibold uppercase tracking-wider ${
                    darkMode
                      ? "border-white/10 text-slate-500"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <span>Position</span>
                  <span>Location</span>
                  <span>Applied</span>
                  <span>Status</span>
                  <span></span>
                </div>

                {filteredApplications.map(
                  (application) => (
                    <DesktopApplicationRow
                      key={application.id}
                      application={application}
                      darkMode={darkMode}
                    />
                  )
                )}
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredApplications.map(
                  (application) => (
                    <MobileApplicationCard
                      key={application.id}
                      application={application}
                      darkMode={darkMode}
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-30 border-t px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden ${
          darkMode
            ? "border-white/10 bg-[#080c13]/95"
            : "border-slate-200 bg-white/95"
        } backdrop-blur-xl`}
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <MobileNavItem
            href="/candidate/dashboard"
            label="Home"
            icon={<BriefcaseBusiness size={19} />}
            darkMode={darkMode}
          />

          <MobileNavItem
            href="/candidate/jobs"
            label="Jobs"
            icon={<Search size={19} />}
            darkMode={darkMode}
          />

          <MobileNavItem
            href="/candidate/applications"
            label="Applications"
            icon={<FileText size={19} />}
            active
            darkMode={darkMode}
          />

          <MobileNavItem
            href="/candidate/profile"
            label="Profile"
            icon={<UsersIcon />}
            darkMode={darkMode}
          />
        </div>
      </nav>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  darkMode,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  darkMode: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        darkMode
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`flex size-9 items-center justify-center rounded-xl ${
          darkMode
            ? "bg-white/10 text-slate-300"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </div>

      <p
        className={`mt-4 text-xs ${
          darkMode
            ? "text-slate-500"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function DesktopApplicationRow({
  application,
  darkMode,
}: {
  application: Application;
  darkMode: boolean;
}) {
  const job = application.job;

  if (!job) return null;

  return (
    <div
      className={`grid grid-cols-[minmax(260px,1.5fr)_180px_150px_130px_100px] items-center gap-4 border-b px-6 py-5 last:border-b-0 ${
        darkMode
          ? "border-white/10 hover:bg-white/[0.03]"
          : "border-slate-100 hover:bg-slate-50/80"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <CompanyLogo
          company={job.company}
          darkMode={darkMode}
          size="md"
        />

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {job.title}
          </h3>

          <p
            className={`mt-1 truncate text-xs ${
              darkMode
                ? "text-slate-400"
                : "text-slate-600"
            }`}
          >
            {job.company?.name || "Company not specified"}
          </p>

          <p
            className={`mt-1 text-xs ${
              darkMode
                ? "text-slate-500"
                : "text-slate-500"
            }`}
          >
            {formatEmploymentType(
              job.employment_type
            )}{" "}
            · {formatExperience(job.experience_level)}
          </p>
        </div>
      </div>

      <div
        className={`flex items-center gap-2 text-sm ${
          darkMode
            ? "text-slate-300"
            : "text-slate-700"
        }`}
      >
        <MapPin size={15} className="shrink-0" />
        <span className="truncate">
          {job.location || "Remote / Not specified"}
        </span>
      </div>

      <div>
        <p
          className={`text-sm ${
            darkMode
              ? "text-slate-300"
              : "text-slate-700"
          }`}
        >
          {formatDate(application.applied_at)}
        </p>

        <p
          className={`mt-1 text-xs ${
            darkMode
              ? "text-slate-500"
              : "text-slate-500"
          }`}
        >
          Applied
        </p>
      </div>

      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusStyle(
          application.status,
          darkMode
        )}`}
      >
        {getStatusIcon(application.status)}
        {formatStatus(application.status)}
      </span>

      <Link
        href={`/candidate/jobs/${job.id}`}
        className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold ${
          darkMode
            ? "border-white/10 text-slate-200 hover:bg-white/10"
            : "border-slate-200 text-slate-700 hover:bg-slate-100"
        }`}
      >
        View
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function MobileApplicationCard({
  application,
  darkMode,
}: {
  application: Application;
  darkMode: boolean;
}) {
  const job = application.job;

  if (!job) return null;

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        darkMode
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo
          company={job.company}
          darkMode={darkMode}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">
                {job.title}
              </h3>

              <p
                className={`mt-1 truncate text-xs ${
                  darkMode
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                {job.company?.name ||
                  "Company not specified"}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusStyle(
                application.status,
                darkMode
              )}`}
            >
              {getStatusIcon(application.status)}
              {formatStatus(application.status)}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 grid grid-cols-2 gap-3 border-t pt-4 ${
          darkMode
            ? "border-white/10"
            : "border-slate-100"
        }`}
      >
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              darkMode
                ? "text-slate-500"
                : "text-slate-500"
            }`}
          >
            Location
          </p>

          <p
            className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${
              darkMode
                ? "text-slate-300"
                : "text-slate-700"
            }`}
          >
            <MapPin size={13} />
            <span className="truncate">
              {job.location || "Not specified"}
            </span>
          </p>
        </div>

        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              darkMode
                ? "text-slate-500"
                : "text-slate-500"
            }`}
          >
            Applied
          </p>

          <p
            className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${
              darkMode
                ? "text-slate-300"
                : "text-slate-700"
            }`}
          >
            <CalendarDays size={13} />
            {formatDate(application.applied_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/candidate/jobs/${job.id}`}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${
            darkMode
              ? "bg-white text-slate-900"
              : "bg-slate-900 text-white"
          }`}
        >
          View job
          <ChevronRight size={14} />
        </Link>

        {application.resume_url && (
          <a
            href={application.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-10 items-center justify-center rounded-xl border px-3 ${
              darkMode
                ? "border-white/10 text-slate-300"
                : "border-slate-200 text-slate-700"
            }`}
            aria-label="View submitted resume"
          >
            <FileText size={16} />
          </a>
        )}
      </div>
    </article>
  );
}

function CompanyLogo({
  company,
  darkMode,
  size = "md",
}: {
  company: Application["job"] extends infer T
    ? T extends { company: infer C }
      ? C
      : never
    : never;
  darkMode: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "sm" ? "size-9" : "size-11";

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
        darkMode
          ? "border-white/10 bg-white/10"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {company?.logo_url ? (
        <img
          src={company.logo_url}
          alt={company.name}
          className="size-full object-cover"
        />
      ) : (
        <Building2
          size={size === "sm" ? 16 : 19}
          className={
            darkMode
              ? "text-slate-500"
              : "text-slate-400"
          }
        />
      )}
    </div>
  );
}

function LoadingState({
  darkMode,
}: {
  darkMode: boolean;
}) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className={`animate-pulse rounded-2xl border p-5 ${
            darkMode
              ? "border-white/10 bg-white/[0.04]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex gap-4">
            <div
              className={`size-12 rounded-xl ${
                darkMode
                  ? "bg-white/10"
                  : "bg-slate-200"
              }`}
            />

            <div className="flex-1">
              <div
                className={`h-4 w-1/3 rounded ${
                  darkMode
                    ? "bg-white/10"
                    : "bg-slate-200"
                }`}
              />

              <div
                className={`mt-3 h-3 w-1/4 rounded ${
                  darkMode
                    ? "bg-white/10"
                    : "bg-slate-200"
                }`}
              />

              <div
                className={`mt-5 h-3 w-1/2 rounded ${
                  darkMode
                    ? "bg-white/10"
                    : "bg-slate-200"
                }`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  error,
  darkMode,
  onRetry,
}: {
  error: string;
  darkMode: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      className={`rounded-3xl border p-8 text-center ${
        darkMode
          ? "border-red-400/20 bg-red-400/[0.04]"
          : "border-red-200 bg-white"
      }`}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <FileText size={24} />
      </div>

      <h2 className="mt-5 text-lg font-bold">
        Unable to load applications
      </h2>

      <p
        className={`mx-auto mt-2 max-w-md text-sm ${
          darkMode
            ? "text-slate-400"
            : "text-slate-600"
        }`}
      >
        {error}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className={`mt-5 h-10 rounded-xl px-5 text-sm font-semibold ${
          darkMode
            ? "bg-white text-slate-900"
            : "bg-slate-900 text-white"
        }`}
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({
  hasApplications,
  darkMode,
  clearFilters,
}: {
  hasApplications: boolean;
  darkMode: boolean;
  clearFilters: () => void;
}) {
  if (hasApplications) {
    return (
      <div
        className={`rounded-3xl border p-10 text-center ${
          darkMode
            ? "border-white/10 bg-white/[0.04]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <Search size={24} />
        </div>

        <h2 className="mt-5 text-lg font-bold">
          No matching applications
        </h2>

        <p
          className={`mt-2 text-sm ${
            darkMode
              ? "text-slate-400"
              : "text-slate-600"
          }`}
        >
          Try changing your search or status filter.
        </p>

        <button
          type="button"
          onClick={clearFilters}
          className={`mt-5 h-10 rounded-xl px-5 text-sm font-semibold ${
            darkMode
              ? "bg-white text-slate-900"
              : "bg-slate-900 text-white"
          }`}
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border p-10 text-center ${
        darkMode
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
        <BriefcaseBusiness size={27} />
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
        You haven't applied to any jobs yet. Explore
        available opportunities and submit your first
        application.
      </p>

      <Link
        href="/candidate/jobs"
        className={`mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold ${
          darkMode
            ? "bg-white text-slate-900"
            : "bg-slate-900 text-white"
        }`}
      >
        <Search size={16} />
        Browse jobs
      </Link>
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  icon,
  active = false,
  darkMode,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  darkMode: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium ${
        active
          ? darkMode
            ? "text-white"
            : "text-slate-950"
          : darkMode
            ? "text-slate-500"
            : "text-slate-500"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function UsersIcon() {
  return <Users size={19} />;
}