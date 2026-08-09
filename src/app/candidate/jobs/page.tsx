"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Clock3,
  Filter,
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string;
  description: string;
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
    | null;
  status: "draft" | "published" | "closed" | "archived";
  application_deadline: string | null;
  created_at: string;
};

type Department = {
  id: string;
  name: string;
};

const employmentLabels: Record<Job["employment_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const experienceLabels: Record<
  NonNullable<Job["experience_level"]>,
  string
> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead",
};

export default function CandidateJobsPage() {
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [department, setDepartment] = useState("");

  const [darkMode, setDarkMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError("");

      const [
        { data: jobsData, error: jobsError },
        { data: departmentData, error: departmentError },
      ] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,title,description,location,employment_type,experience_level,status,application_deadline,created_at"
          )
          .eq("status", "published")
          .order("created_at", { ascending: false }),

        supabase
          .from("departments")
          .select("id,name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (jobsError) {
        setError(jobsError.message);
        setJobs([]);
      } else {
        setJobs((jobsData ?? []) as Job[]);
      }

      if (!departmentError) {
        setDepartments((departmentData ?? []) as Department[]);
      }

      setLoading(false);
    }

    loadJobs();
  }, [supabase]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query);

      const matchesLocation =
        !location ||
        job.location?.toLowerCase().includes(location.toLowerCase());

      const matchesEmployment =
        !employmentType ||
        job.employment_type === employmentType;

      const matchesExperience =
        !experienceLevel ||
        job.experience_level === experienceLevel;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesEmployment &&
        matchesExperience
      );
    });
  }, [
    jobs,
    search,
    location,
    employmentType,
    experienceLevel,
  ]);

  function clearFilters() {
    setSearch("");
    setLocation("");
    setEmploymentType("");
    setExperienceLevel("");
    setDepartment("");
  }

  const hasFilters = Boolean(
    search ||
      location ||
      employmentType ||
      experienceLevel ||
      department
  );

  function FilterContent() {
    return (
      <div className="space-y-5">
        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-2 block text-xs font-semibold"
          >
            Location
          </label>

          <input
            id="location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Kathmandu"
            className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition ${
              darkMode
                ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-white/30"
                : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-300"
            }`}
          />
        </div>

        {/* Employment */}
        <div>
          <label
            htmlFor="employment"
            className="mb-2 block text-xs font-semibold"
          >
            Employment type
          </label>

          <div className="relative">
            <select
              id="employment"
              value={employmentType}
              onChange={(event) =>
                setEmploymentType(event.target.value)
              }
              className={`h-11 w-full appearance-none rounded-xl border px-3 pr-9 text-sm outline-none ${
                darkMode
                  ? "border-white/10 bg-white/5 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <option value="">All types</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
            />
          </div>
        </div>

        {/* Experience */}
        <div>
          <label
            htmlFor="experience"
            className="mb-2 block text-xs font-semibold"
          >
            Experience
          </label>

          <div className="relative">
            <select
              id="experience"
              value={experienceLevel}
              onChange={(event) =>
                setExperienceLevel(event.target.value)
              }
              className={`h-11 w-full appearance-none rounded-xl border px-3 pr-9 text-sm outline-none ${
                darkMode
                  ? "border-white/10 bg-white/5 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <option value="">All levels</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label
            htmlFor="department"
            className="mb-2 block text-xs font-semibold"
          >
            Department
          </label>

          <div className="relative">
            <select
              id="department"
              value={department}
              onChange={(event) =>
                setDepartment(event.target.value)
              }
              className={`h-11 w-full appearance-none rounded-xl border px-3 pr-9 text-sm outline-none ${
                darkMode
                  ? "border-white/10 bg-white/5 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <option value="">All departments</option>

              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={`w-full rounded-xl py-2.5 text-sm font-medium transition ${
              darkMode
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <main
      className={`min-h-dvh overflow-x-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#080b12] text-white"
          : "bg-[#f6f9fc] text-slate-900"
      }`}
    >
      {/* HEADER */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          darkMode
            ? "border-white/10 bg-[#080b12]/85"
            : "border-slate-200/80 bg-white/85"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                darkMode
                  ? "bg-white text-slate-900"
                  : "bg-slate-900 text-white"
              }`}
            >
              <BriefcaseBusiness size={18} />
            </div>

            <span className="text-lg font-bold tracking-tight">
              RMS
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/candidate/dashboard"
              className={`hidden rounded-xl px-3 py-2 text-sm font-medium transition sm:block ${
                darkMode
                  ? "text-slate-300 hover:bg-white/5"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Dashboard
            </Link>

            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className={`flex size-10 items-center justify-center rounded-xl border transition ${
                darkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className={`pointer-events-none absolute inset-0 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_50%_0%,#173047,transparent_55%)]"
              : "bg-[radial-gradient(circle_at_50%_0%,#dff5ff,transparent_55%)]"
          }`}
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8 lg:pt-16">
          <div className="max-w-2xl">
            <p
              className={`mb-3 text-xs font-bold tracking-[0.16em] sm:text-sm ${
                darkMode ? "text-cyan-300" : "text-cyan-700"
              }`}
            >
              CAREER OPPORTUNITIES
            </p>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Find your next
              <span className="block">career opportunity.</span>
            </h1>

            <p
              className={`mt-4 max-w-xl text-sm leading-6 sm:text-base ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Explore open positions and discover opportunities
              that match your skills, experience, and ambitions.
            </p>
          </div>

          {/* SEARCH */}
          <div
            className={`mt-7 rounded-2xl border p-2 shadow-xl sm:mt-8 ${
              darkMode
                ? "border-white/10 bg-white/[0.06] shadow-black/20"
                : "border-white bg-white/80 shadow-slate-200/70"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
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
                  placeholder="Search jobs by title or keyword..."
                  className={`h-12 w-full rounded-xl bg-transparent pl-11 pr-4 text-sm outline-none ${
                    darkMode
                      ? "text-white placeholder:text-slate-500"
                      : "text-slate-900 placeholder:text-slate-400"
                  }`}
                />
              </div>

              {/* Mobile filters button */}
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={`flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition active:scale-[0.98] sm:w-auto lg:hidden ${
                  darkMode
                    ? "bg-white text-slate-900"
                    : "bg-slate-900 text-white"
                }`}
              >
                <SlidersHorizontal size={17} />
                Filters
                {hasFilters && (
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                      darkMode
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    !
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          {/* DESKTOP FILTERS */}
          <aside className="hidden lg:block">
            <div
              className={`sticky top-24 rounded-2xl border p-5 ${
                darkMode
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-5 flex items-center gap-2">
                <Filter size={17} />

                <h2 className="font-semibold">
                  Filter jobs
                </h2>
              </div>

              <FilterContent />
            </div>
          </aside>

          {/* JOB RESULTS */}
          <div className="min-w-0">
            <div className="mb-5 flex min-w-0 items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Available positions
                </h2>

                <p
                  className={`mt-1 text-xs sm:text-sm ${
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-500"
                  }`}
                >
                  {filteredJobs.length}{" "}
                  {filteredJobs.length === 1
                    ? "position"
                    : "positions"}{" "}
                  available
                </p>
              </div>

              {/* Active filter indicator */}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`hidden shrink-0 text-xs font-medium sm:block ${
                    darkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className={`min-h-[190px] animate-pulse rounded-2xl border ${
                      darkMode
                        ? "border-white/10 bg-white/5"
                        : "border-slate-200 bg-white"
                    }`}
                  />
                ))}
              </div>
            ) : error ? (
              /* ERROR */
              <div
                className={`rounded-2xl border p-6 sm:p-8 ${
                  darkMode
                    ? "border-red-400/20 bg-red-500/10"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <h3 className="font-semibold text-red-500">
                  Unable to load jobs
                </h3>

                <p className="mt-2 break-words text-sm text-red-500/80">
                  {error}
                </p>
              </div>
            ) : filteredJobs.length === 0 ? (
              /* EMPTY */
              <div
                className={`rounded-2xl border p-8 text-center sm:p-12 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`mx-auto flex size-12 items-center justify-center rounded-full ${
                    darkMode
                      ? "bg-white/10"
                      : "bg-slate-100"
                  }`}
                >
                  <Search size={22} className="opacity-50" />
                </div>

                <h3 className="mt-4 font-semibold">
                  No jobs found
                </h3>

                <p
                  className={`mx-auto mt-2 max-w-sm text-sm leading-5 ${
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-500"
                  }`}
                >
                  Try changing your search or adjusting your
                  filters to find more opportunities.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 text-sm font-semibold underline underline-offset-4"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              /* JOB CARDS */
              <div className="grid gap-4">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/candidate/jobs/${job.id}`}
                    className={`group block min-w-0 rounded-2xl border p-4 transition-all sm:p-5 ${
                      darkMode
                        ? "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
                      {/* Job header */}
                      <div className="flex min-w-0 gap-3">
                        <div
                          className={`flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12 ${
                            darkMode
                              ? "bg-white/10"
                              : "bg-slate-100"
                          }`}
                        >
                          <Building2 size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold group-hover:underline sm:text-lg">
                            {job.title}
                          </h3>

                          <p
                            className={`mt-0.5 truncate text-sm ${
                              darkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            Recruitment Management System
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        className={`line-clamp-2 text-sm leading-6 ${
                          darkMode
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        {job.description}
                      </p>

                      {/* Metadata */}
                      <div className="flex min-w-0 flex-col gap-3">
                        <div className="flex min-w-0 flex-wrap gap-2">
                          <span
                            className={`max-w-full rounded-lg px-2.5 py-1 text-xs font-medium ${
                              darkMode
                                ? "bg-white/10 text-slate-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {employmentLabels[
                              job.employment_type
                            ]}
                          </span>

                          {job.experience_level && (
                            <span
                              className={`max-w-full rounded-lg px-2.5 py-1 text-xs font-medium ${
                                darkMode
                                  ? "bg-white/10 text-slate-300"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {
                                experienceLabels[
                                  job.experience_level
                                ]
                              }
                            </span>
                          )}
                        </div>

                        <div
                          className={`flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm ${
                            darkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                        >
                          {job.location && (
                            <span className="flex min-w-0 items-center gap-1.5">
                              <MapPin
                                size={14}
                                className="shrink-0"
                              />

                              <span className="truncate">
                                {job.location}
                              </span>
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            <Clock3
                              size={14}
                              className="shrink-0"
                            />

                            <span>
                              {new Date(
                                job.created_at
                              ).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MOBILE FILTER DRAWER */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <div
            className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] border-t shadow-2xl ${
              darkMode
                ? "border-white/10 bg-[#0c1018] text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            {/* Handle */}
            <div className="flex shrink-0 justify-center py-3">
              <div
                className={`h-1.5 w-12 rounded-full ${
                  darkMode
                    ? "bg-white/20"
                    : "bg-slate-300"
                }`}
              />
            </div>

            {/* Drawer header */}
            <div className="flex shrink-0 items-center justify-between border-b px-5 pb-4">
              <div className="flex items-center gap-2">
                <Filter size={18} />

                <h2 className="text-base font-semibold">
                  Filter jobs
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
                aria-label="Close filters"
              >
                <X size={17} />
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterContent />
            </div>

            {/* Drawer action */}
            <div
              className={`shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
                darkMode
                  ? "border-white/10 bg-[#0c1018]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className={`h-12 w-full rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
                  darkMode
                    ? "bg-white text-slate-900"
                    : "bg-slate-900 text-white"
                }`}
              >
                Show {filteredJobs.length}{" "}
                {filteredJobs.length === 1
                  ? "position"
                  : "positions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}