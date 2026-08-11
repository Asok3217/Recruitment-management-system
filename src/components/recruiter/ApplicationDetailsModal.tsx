"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  CalendarDays,
  FileText,
  MessageSquare,
  CheckCircle2,
  Loader2,
  ExternalLink,
  BriefcaseBusiness,
  MapPin,
  Send,
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

type ApplicationNote = {
  id: string;
  application_id: string;
  author_id: string;
  note: string;
  created_at: string;
};

type Interview = {
  id: string;
  application_id: string;
  interviewer_id: string;
  interview_type:
    | "phone"
    | "video"
    | "in_person"
    | "technical"
    | "hr";
  status:
    | "scheduled"
    | "completed"
    | "cancelled"
    | "rescheduled";
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  location: string | null;
  notes: string | null;
};

const statusOptions: {
  value: ApplicationStatus;
  label: string;
}[] = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "hired", label: "Hired" },
];

const interviewTypes = [
  { value: "phone", label: "Phone" },
  { value: "video", label: "Video" },
  { value: "in_person", label: "In person" },
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
] as const;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default function ApplicationDetailsModal({
  application,
  onClose,
  onUpdated,
}: {
  application: Application;
  onClose: () => void;
  onUpdated: (
    application: Partial<Application> & { id: string }
  ) => void;
}) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "interview" | "offer"
  >("overview");

  const [status, setStatus] = useState<ApplicationStatus>(
    application.status
  );

  const [statusNote, setStatusNote] = useState("");
  const [note, setNote] = useState("");

  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingInterviews, setLoadingInterviews] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [schedulingInterview, setSchedulingInterview] =
    useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [interviewType, setInterviewType] =
    useState<(typeof interviewTypes)[number]["value"]>("video");

  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [offerTerms, setOfferTerms] = useState("");

  useEffect(() => {
    if (activeTab === "notes") {
      loadNotes();
    }

    if (activeTab === "interview") {
      loadInterviews();
    }
  }, [activeTab]);

  async function loadNotes() {
    try {
      setLoadingNotes(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("application_notes")
        .select(
          `
          id,
          application_id,
          author_id,
          note,
          created_at
        `
        )
        .eq("application_id", application.id)
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setNotes((data ?? []) as ApplicationNote[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notes."
      );
    } finally {
      setLoadingNotes(false);
    }
  }

  async function loadInterviews() {
    try {
      setLoadingInterviews(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", application.id)
        .order("scheduled_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setInterviews((data ?? []) as Interview[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load interviews."
      );
    } finally {
      setLoadingInterviews(false);
    }
  }

  async function updateStatus() {
    if (status === application.status && !statusNote.trim()) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "recruiter_update_application_status",
        {
          p_application_id: application.id,
          p_new_status: status,
          p_notes: statusNote.trim() || undefined,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      onUpdated({
        id: application.id,
        status: data.status,
        updated_at: data.updated_at,
      });

      setStatusNote("");
      setMessage(
        "Application status updated successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update application status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function addNote() {
    if (!note.trim()) {
      return;
    }

    try {
      setAddingNote(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "recruiter_add_application_note",
        {
          p_application_id: application.id,
          p_note: note.trim(),
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setNotes((current) => [
        data as ApplicationNote,
        ...current,
      ]);

      setNote("");
      setMessage("Note added successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add note."
      );
    } finally {
      setAddingNote(false);
    }
  }

  async function scheduleInterview() {
    if (!scheduledAt) {
      setError(
        "Please select an interview date and time."
      );
      return;
    }

    if (Number(duration) <= 0) {
      setError("Duration must be greater than 0 minutes.");
      return;
    }

    try {
      setSchedulingInterview(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "recruiter_schedule_interview",
        {
          p_application_id: application.id,
          p_interview_type: interviewType,
          p_scheduled_at: new Date(
            scheduledAt
          ).toISOString(),
          p_duration_minutes: Number(duration),
          p_meeting_url:
            meetingUrl.trim() || undefined,
          p_location:
            location.trim() || undefined,
          p_notes:
            interviewNotes.trim() || undefined,
          p_interviewer_id: undefined,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setInterviews((current) => [
        data as Interview,
        ...current,
      ]);

      onUpdated({
        id: application.id,
        status: "interview",
      });

      setStatus("interview");

      setScheduledAt("");
      setMeetingUrl("");
      setLocation("");
      setInterviewNotes("");

      setMessage(
        "Interview scheduled successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to schedule interview."
      );
    } finally {
      setSchedulingInterview(false);
    }
  }

  async function sendOffer() {
    const numericSalary = Number(salary);

    if (!salary || Number.isNaN(numericSalary)) {
      setError("Please enter a valid salary.");
      return;
    }

    if (numericSalary < 0) {
      setError("Salary cannot be negative.");
      return;
    }

    try {
      setSendingOffer(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "recruiter_send_offer",
        {
          p_application_id: application.id,
          p_salary: numericSalary,
          p_start_date: startDate || undefined,
          p_expiry_date:
            expiryDate || undefined,
          p_terms:
            offerTerms.trim() || undefined,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log("Offer created:", data);

      onUpdated({
        id: application.id,
        status: "offer_sent",
      });

      setStatus("offer_sent");

      setMessage(
        "Offer sent successfully. The candidate has been notified."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send offer."
      );
    } finally {
      setSendingOffer(false);
    }
  }

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-slate-950/50
        p-3 backdrop-blur-sm
        sm:p-6
        dark:bg-black/70
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          flex max-h-[94dvh] w-full max-w-5xl
          flex-col overflow-hidden
          rounded-3xl
          border border-slate-200
          bg-white
          text-slate-900
          shadow-2xl
          dark:border-white/10
          dark:bg-[#0d1119]
          dark:text-white
        "
      >
        {/* Header */}
        <header
          className="
            flex items-start justify-between
            border-b border-slate-200
            bg-white
            p-5
            sm:p-6
            dark:border-white/10
            dark:bg-[#0d1119]
          "
        >
          <div className="flex min-w-0 items-center gap-4">
            {application.candidate?.avatar_url ? (
              <img
                src={application.candidate.avatar_url}
                alt={application.candidate.full_name}
                className="
                  size-12 shrink-0 rounded-full
                  object-cover
                  ring-2 ring-slate-100
                  dark:ring-white/10
                "
              />
            ) : (
              <div
                className="
                  flex size-12 shrink-0
                  items-center justify-center
                  rounded-full
                  bg-slate-900
                  text-sm font-bold text-white
                  dark:bg-white
                  dark:text-slate-900
                "
              >
                {application.candidate?.full_name
                  ?.split(" ")
                  .map((name) => name[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() ?? "C"}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold sm:text-xl">
                {application.candidate?.full_name ??
                  "Unknown candidate"}
              </h2>

              <p
                className="
                  mt-1 truncate text-sm
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {application.job?.title ??
                  "Unknown position"}
              </p>

              {application.job?.company_name && (
                <p
                  className="
                    mt-0.5 truncate text-xs
                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  {application.job.company_name}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex size-9 shrink-0
              items-center justify-center
              rounded-xl
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-900
              dark:hover:bg-white/[0.08]
              dark:hover:text-white
            "
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div
          className="
            overflow-x-auto
            border-b border-slate-200
            bg-white
            dark:border-white/10
            dark:bg-[#0d1119]
          "
        >
          <nav className="flex min-w-max px-4 sm:px-6">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => {
                setActiveTab("overview");
                setError("");
                setMessage("");
              }}
            >
              Overview
            </TabButton>

            <TabButton
              active={activeTab === "notes"}
              onClick={() => {
                setActiveTab("notes");
                setError("");
                setMessage("");
              }}
            >
              Notes
            </TabButton>

            <TabButton
              active={activeTab === "interview"}
              onClick={() => {
                setActiveTab("interview");
                setError("");
                setMessage("");
              }}
            >
              Interview
            </TabButton>

            <TabButton
              active={activeTab === "offer"}
              onClick={() => {
                setActiveTab("offer");
                setError("");
                setMessage("");
              }}
            >
              Offer
            </TabButton>
          </nav>
        </div>

        {/* Content */}
        <div
          className="
            flex-1 overflow-y-auto
            bg-white
            p-5 sm:p-6
            dark:bg-[#0d1119]
          "
        >
          {error && (
            <div
              className="
                mb-5 rounded-xl
                border border-red-500/20
                bg-red-500/10
                px-4 py-3
                text-sm
                text-red-600
                dark:text-red-400
              "
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="
                mb-5 rounded-xl
                border border-emerald-500/20
                bg-emerald-500/10
                px-4 py-3
                text-sm
                text-emerald-600
                dark:text-emerald-400
              "
            >
              {message}
            </div>
          )}

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Candidate */}
              <section>
                <SectionTitle>
                  Candidate information
                </SectionTitle>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    icon={<Mail size={17} />}
                    label="Email"
                    value={
                      application.candidate?.email ??
                      "Not available"
                    }
                  />

                  <InfoItem
                    icon={<Phone size={17} />}
                    label="Phone"
                    value={
                      application.candidate?.phone ??
                      "Not provided"
                    }
                  />

                  <InfoItem
                    icon={<CalendarDays size={17} />}
                    label="Applied"
                    value={formatDate(
                      application.applied_at
                    )}
                  />

                  <InfoItem
                    icon={<BriefcaseBusiness size={17} />}
                    label="Position"
                    value={
                      application.job?.title ??
                      "Unknown position"
                    }
                  />

                  {application.job?.location && (
                    <InfoItem
                      icon={<MapPin size={17} />}
                      label="Location"
                      value={application.job.location}
                    />
                  )}

                  {application.job?.employment_type && (
                    <InfoItem
                      icon={<BriefcaseBusiness size={17} />}
                      label="Employment type"
                      value={formatStatus(
                        application.job.employment_type
                      )}
                    />
                  )}
                </div>
              </section>

              {/* Application */}
              <section>
                <SectionTitle>
                  Application
                </SectionTitle>

                <div
                  className="
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    p-4
                    dark:border-white/10
                    dark:bg-white/[0.02]
                  "
                >
                  <div className="mb-5">
                    <p
                      className="
                        mb-2 text-xs font-semibold
                        uppercase tracking-wide
                        text-slate-400
                      "
                    >
                      Current status
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(
                            event.target
                              .value as ApplicationStatus
                          )
                        }
                        className="
                          h-11 flex-1 rounded-xl
                          border border-slate-200
                          bg-slate-50
                          px-3 text-sm
                          text-slate-900
                          outline-none
                          transition
                          focus:border-slate-400
                          focus:ring-2
                          focus:ring-slate-200
                          dark:border-white/10
                          dark:bg-white/[0.04]
                          dark:text-white
                          dark:focus:border-white/20
                          dark:focus:ring-white/5
                        "
                      >
                        {statusOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="
                              bg-white
                              text-slate-900
                              dark:bg-slate-900
                              dark:text-white
                            "
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={updateStatus}
                        disabled={updatingStatus}
                        className="
                          inline-flex h-11
                          items-center justify-center
                          gap-2 rounded-xl
                          bg-slate-900
                          px-5
                          text-sm font-semibold
                          text-white
                          shadow-sm
                          transition
                          hover:bg-slate-800
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                          dark:bg-white
                          dark:text-slate-900
                          dark:hover:bg-slate-200
                        "
                      >
                        {updatingStatus ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}

                        Update status
                      </button>
                    </div>

                    <textarea
                      value={statusNote}
                      onChange={(event) =>
                        setStatusNote(event.target.value)
                      }
                      placeholder="Optional status note..."
                      rows={3}
                      className="
                        mt-3 w-full resize-none
                        rounded-xl
                        border border-slate-200
                        bg-slate-50
                        p-3 text-sm
                        text-slate-900
                        outline-none
                        placeholder:text-slate-400
                        focus:border-slate-400
                        focus:ring-2
                        focus:ring-slate-200
                        dark:border-white/10
                        dark:bg-white/[0.04]
                        dark:text-white
                        dark:placeholder:text-slate-500
                        dark:focus:border-white/20
                        dark:focus:ring-white/5
                      "
                    />
                  </div>

                  {application.resume_url && (
                    <a
                      href={application.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        inline-flex h-10
                        items-center gap-2
                        rounded-xl
                        border border-slate-200
                        bg-white
                        px-4
                        text-sm font-semibold
                        text-slate-700
                        shadow-sm
                        transition
                        hover:bg-slate-50
                        dark:border-white/10
                        dark:bg-white/[0.03]
                        dark:text-slate-200
                        dark:hover:bg-white/[0.06]
                      "
                    >
                      <FileText size={16} />
                      View resume
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </section>

              {/* Cover letter */}
              <section>
                <SectionTitle>
                  Cover letter
                </SectionTitle>

                <div
                  className="
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    p-4
                    text-sm leading-6
                    text-slate-600
                    dark:border-white/10
                    dark:bg-white/[0.02]
                    dark:text-slate-300
                  "
                >
                  {application.cover_letter ||
                    "No cover letter was submitted."}
                </div>
              </section>
            </div>
          )}

          {/* NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              <section>
                <SectionTitle>
                  Add recruiter note
                </SectionTitle>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Write an internal note about this candidate..."
                  rows={4}
                  className="
                    w-full resize-none
                    rounded-2xl
                    border border-slate-200
                    bg-slate-50
                    p-4 text-sm
                    text-slate-900
                    outline-none
                    placeholder:text-slate-400
                    focus:border-slate-400
                    focus:ring-2
                    focus:ring-slate-200
                    dark:border-white/10
                    dark:bg-white/[0.04]
                    dark:text-white
                    dark:placeholder:text-slate-500
                    dark:focus:border-white/20
                    dark:focus:ring-white/5
                  "
                />

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={addingNote || !note.trim()}
                    className="
                      inline-flex h-10
                      items-center gap-2
                      rounded-xl
                      bg-slate-900
                      px-4
                      text-sm font-semibold
                      text-white
                      transition
                      hover:bg-slate-800
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      dark:bg-white
                      dark:text-slate-900
                      dark:hover:bg-slate-200
                    "
                  >
                    {addingNote ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <MessageSquare size={16} />
                    )}

                    Add note
                  </button>
                </div>
              </section>

              <section>
                <SectionTitle>
                  Previous notes
                </SectionTitle>

                {loadingNotes ? (
                  <LoadingBlock />
                ) : notes.length === 0 ? (
                  <EmptyBlock text="No notes have been added yet." />
                ) : (
                  <div className="space-y-3">
                    {notes.map((item) => (
                      <div
                        key={item.id}
                        className="
                          rounded-2xl
                          border border-slate-200
                          bg-white
                          p-4
                          dark:border-white/10
                          dark:bg-white/[0.02]
                        "
                      >
                        <p
                          className="
                            whitespace-pre-wrap
                            text-sm leading-6
                            text-slate-700
                            dark:text-slate-300
                          "
                        >
                          {item.note}
                        </p>

                        <p
                          className="
                            mt-3 text-xs
                            text-slate-400
                            dark:text-slate-500
                          "
                        >
                          {formatDateTime(
                            item.created_at
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* INTERVIEW */}
          {activeTab === "interview" && (
            <div className="space-y-6">
              <section>
                <SectionTitle>
                  Schedule interview
                </SectionTitle>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Interview type">
                    <select
                      value={interviewType}
                      onChange={(event) =>
                        setInterviewType(
                          event.target
                            .value as typeof interviewType
                        )
                      }
                      className="input"
                    >
                      {interviewTypes.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                          className="
                            bg-white text-slate-900
                            dark:bg-slate-900
                            dark:text-white
                          "
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Date and time">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) =>
                        setScheduledAt(event.target.value)
                      }
                      className="input"
                    />
                  </FormField>

                  <FormField label="Duration (minutes)">
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(event) =>
                        setDuration(event.target.value)
                      }
                      className="input"
                    />
                  </FormField>

                  <FormField label="Meeting URL">
                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(event) =>
                        setMeetingUrl(event.target.value)
                      }
                      placeholder="https://meet.google.com/..."
                      className="input"
                    />
                  </FormField>

                  <FormField label="Location">
                    <input
                      type="text"
                      value={location}
                      onChange={(event) =>
                        setLocation(event.target.value)
                      }
                      placeholder="Office / meeting room"
                      className="input"
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label="Interview notes">
                      <textarea
                        value={interviewNotes}
                        onChange={(event) =>
                          setInterviewNotes(
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Optional interview instructions..."
                        className="
                          input resize-none
                          py-3
                        "
                      />
                    </FormField>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={scheduleInterview}
                    disabled={
                      schedulingInterview ||
                      !scheduledAt
                    }
                    className="
                      inline-flex h-11
                      items-center gap-2
                      rounded-xl
                      bg-slate-900
                      px-5
                      text-sm font-semibold
                      text-white
                      transition
                      hover:bg-slate-800
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      dark:bg-white
                      dark:text-slate-900
                      dark:hover:bg-slate-200
                    "
                  >
                    {schedulingInterview ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CalendarDays size={16} />
                    )}

                    Schedule interview
                  </button>
                </div>
              </section>

              <section>
                <SectionTitle>
                  Interview history
                </SectionTitle>

                {loadingInterviews ? (
                  <LoadingBlock />
                ) : interviews.length === 0 ? (
                  <EmptyBlock text="No interviews scheduled." />
                ) : (
                  <div className="space-y-3">
                    {interviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="
                          rounded-2xl
                          border border-slate-200
                          bg-white
                          p-4
                          dark:border-white/10
                          dark:bg-white/[0.02]
                        "
                      >
                        <div
                          className="
                            flex flex-col gap-3
                            sm:flex-row
                            sm:items-start
                            sm:justify-between
                          "
                        >
                          <div>
                            <p className="font-semibold">
                              {formatStatus(
                                interview.interview_type
                              )}{" "}
                              interview
                            </p>

                            <p
                              className="
                                mt-1 text-sm
                                text-slate-500
                                dark:text-slate-400
                              "
                            >
                              {formatDateTime(
                                interview.scheduled_at
                              )}
                            </p>
                          </div>

                          <span
                            className="
                              w-fit rounded-full
                              border border-slate-200
                              bg-slate-50
                              px-2.5 py-1
                              text-xs font-semibold
                              text-slate-600
                              dark:border-white/10
                              dark:bg-white/[0.04]
                              dark:text-slate-300
                            "
                          >
                            {formatStatus(
                              interview.status
                            )}
                          </span>
                        </div>

                        <div
                          className="
                            mt-4 grid gap-2
                            text-sm
                            text-slate-500
                            sm:grid-cols-2
                            dark:text-slate-400
                          "
                        >
                          <p>
                            Duration:{" "}
                            <span
                              className="
                                font-medium
                                text-slate-800
                                dark:text-slate-200
                              "
                            >
                              {interview.duration_minutes} min
                            </span>
                          </p>

                          {interview.location && (
                            <p className="flex items-center gap-1.5">
                              <MapPin size={14} />
                              {interview.location}
                            </p>
                          )}
                        </div>

                        {interview.meeting_url && (
                          <a
                            href={interview.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="
                              mt-3 inline-flex
                              items-center gap-2
                              text-sm font-semibold
                              text-blue-600
                              hover:underline
                              dark:text-blue-400
                            "
                          >
                            Join meeting
                            <ExternalLink size={14} />
                          </a>
                        )}

                        {interview.notes && (
                          <div
                            className="
                              mt-4 rounded-xl
                              bg-slate-50 p-3
                              text-sm leading-5
                              text-slate-600
                              dark:bg-white/[0.04]
                              dark:text-slate-300
                            "
                          >
                            {interview.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* OFFER */}
          {activeTab === "offer" && (
            <div className="space-y-6">
              <section>
                <SectionTitle>
                  Send job offer
                </SectionTitle>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Salary">
                    <input
                      type="number"
                      min="0"
                      value={salary}
                      onChange={(event) =>
                        setSalary(event.target.value)
                      }
                      placeholder="e.g. 800000"
                      className="input"
                    />
                  </FormField>

                  <FormField label="Start date">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) =>
                        setStartDate(event.target.value)
                      }
                      className="input"
                    />
                  </FormField>

                  <FormField label="Expiry date">
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(event) =>
                        setExpiryDate(event.target.value)
                      }
                      className="input"
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label="Terms and conditions">
                      <textarea
                        value={offerTerms}
                        onChange={(event) =>
                          setOfferTerms(event.target.value)
                        }
                        rows={5}
                        placeholder="Enter offer terms, benefits, conditions, probation details, etc."
                        className="
                          input resize-none
                          py-3
                        "
                      />
                    </FormField>
                  </div>
                </div>

                <div
                  className="
                    mt-4 rounded-2xl
                    border border-amber-500/20
                    bg-amber-500/10
                    p-4 text-sm
                    text-amber-700
                    dark:text-amber-300
                  "
                >
                  Sending the offer will create the offer
                  record, change the application status to{" "}
                  <strong>Offer sent</strong>, and notify the
                  candidate.
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={sendOffer}
                    disabled={
                      sendingOffer || !salary
                    }
                    className="
                      inline-flex h-11
                      items-center gap-2
                      rounded-xl
                      bg-slate-900
                      px-5
                      text-sm font-semibold
                      text-white
                      transition
                      hover:bg-slate-800
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      dark:bg-white
                      dark:text-slate-900
                      dark:hover:bg-slate-200
                    "
                  >
                    {sendingOffer ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={16} />
                    )}

                    Send offer
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          color: rgb(15 23 42);
          padding: 0 12px;
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.2s,
            background-color 0.2s,
            color 0.2s,
            box-shadow 0.2s;
        }

        .input::placeholder {
          color: rgb(148 163 184);
        }

        .input:focus {
          border-color: rgb(148 163 184);
          box-shadow: 0 0 0 3px rgb(226 232 240);
        }

        :global(.dark) .input {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: white;
        }

        :global(.dark) .input::placeholder {
          color: rgb(100 116 139);
        }

        :global(.dark) .input:focus {
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
        }

        .input[type="date"],
        .input[type="datetime-local"] {
          color-scheme: light;
        }

        :global(.dark) .input[type="date"],
        :global(.dark) .input[type="datetime-local"] {
          color-scheme: dark;
        }

        .input[type="number"]::-webkit-inner-spin-button,
        .input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        border-b-2
        px-4 py-3.5
        text-sm font-semibold
        transition-colors
        ${
          active
            ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
            : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }
      `}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3
      className="
        mb-3 text-sm font-bold
        uppercase tracking-wide
        text-slate-500
        dark:text-slate-400
      "
    >
      {children}
    </h3>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex items-center gap-3
        rounded-2xl
        border border-slate-200
        bg-white
        p-4
        transition-colors
        dark:border-white/10
        dark:bg-white/[0.02]
      "
    >
      <div
        className="
          flex size-9 shrink-0
          items-center justify-center
          rounded-xl
          bg-slate-100
          text-slate-500
          dark:bg-white/[0.06]
          dark:text-slate-300
        "
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p
          className="
            text-xs
            text-slate-400
            dark:text-slate-500
          "
        >
          {label}
        </p>

        <p
          className="
            mt-0.5 truncate
            text-sm font-medium
            text-slate-800
            dark:text-slate-200
          "
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="
          mb-1.5 block
          text-xs font-semibold
          text-slate-500
          dark:text-slate-400
        "
      >
        {label}
      </span>

      {children}
    </label>
  );
}

function LoadingBlock() {
  return (
    <div
      className="
        flex min-h-32
        items-center justify-center
        rounded-2xl
        border border-slate-200
        bg-white
        dark:border-white/10
        dark:bg-white/[0.02]
      "
    >
      <Loader2
        size={22}
        className="
          animate-spin
          text-slate-400
          dark:text-slate-500
        "
      />
    </div>
  );
}

function EmptyBlock({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        flex min-h-32
        items-center justify-center
        rounded-2xl
        border border-dashed
        border-slate-200
        bg-white
        text-sm text-slate-400
        dark:border-white/10
        dark:bg-white/[0.02]
        dark:text-slate-500
      "
    >
      {text}
    </div>
  );
}