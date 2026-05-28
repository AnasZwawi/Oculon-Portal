import { useEffect, useState, useCallback } from "react";
import "./portal.css";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://lex-chat-406813053868.us-central1.run.app";

// ── Types ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "retained"
  | "declined";

type LeadData = {
  name: string;
  email: string | null;
  phone: string | null;
  caseType: string | null;
  summary: string | null;
  verdict: string | null;           // plain-English first sentence e.g. "Strong case — recommend same-day contact."
  score: "hot" | "warm" | "cold";
  scoreValue: number;
  scoreReason: string | null;
  urgencyLevel: string | null;
  urgencyReason: string | null;
  incidentDate: string | null;
  policeReport: boolean | null;
  represented: boolean | null;
  bestTime: string | null;
  status: LeadStatus;
  createdAt: string;
  transcript: string;
  messages: { role: string; content: string }[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const URGENCY_BADGE: Record<string, string> = {
  critical: "badge-critical",
  high:     "badge-high",
  medium:   "badge-medium",
  low:      "badge-low",
  none:     "badge-low",
};

const URGENCY_LABEL: Record<string, string> = {
  critical: "Critical urgency",
  high:     "High urgency",
  medium:   "Medium urgency",
  low:      "Low urgency",
  none:     "No urgency",
};

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new",       label: "New — not yet contacted" },
  { value: "contacted", label: "Contacted — awaiting response" },
  { value: "scheduled", label: "Intake scheduled" },
  { value: "retained",  label: "Qualified — retained" },
  { value: "declined",  label: "Declined" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportToCSV(data: LeadData) {
  const transcript = data.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/"/g, '""')}`)
    .join("\n");
  const rows = [
    ["Field", "Value"],
    ["Name",          data.name],
    ["Email",         data.email ?? ""],
    ["Phone",         data.phone ?? ""],
    ["Case Type",     data.caseType ?? ""],
    ["Score",         `${data.score} (${data.scoreValue}/20)`],
    ["Score Reason",  data.scoreReason ?? ""],
    ["Urgency",       data.urgencyLevel ?? ""],
    ["Urgency Reason",data.urgencyReason ?? ""],
    ["Incident Date", data.incidentDate ?? ""],
    ["Police Report", data.policeReport == null ? "" : data.policeReport ? "Yes" : "No"],
    ["Represented",   data.represented  == null ? "" : data.represented  ? "Yes" : "No"],
    ["Best Time",     data.bestTime ?? ""],
    ["Status",        data.status],
    ["Summary",       data.summary ?? ""],
    ["Transcript",    transcript],
    ["Created",       data.createdAt],
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `lead-${data.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseMessages(transcript: string) {
  return (transcript ?? "")
    .split(/\n\n(?=USER:|ASSISTANT:)/)
    .filter(Boolean)
    .map((block: string) => {
      const match = block.match(/^(USER|ASSISTANT):\s*([\s\S]*)/i);
      if (!match) return null;
      return {
        role: match[1].toLowerCase() === "assistant" ? "assistant" : "user",
        content: match[2].trim(),
      };
    })
    .filter((m): m is { role: string; content: string } => m !== null)
    .filter(
      (m) => !m.content.includes("__INIT__") && !m.content.includes("<LEAD_DATA>"),
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function MailIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function InfoRow({
  icon, label, value, href,
}: {
  icon: React.ReactNode; label: string; value: string; href?: string;
}) {
  return (
    <div className="info-row">
      <div className="info-icon">{icon}</div>
      <div className="info-col">
        <span className="info-label">{label}</span>
        {href ? (
          <a href={href} className="info-link">{value}</a>
        ) : (
          <span className="info-value">{value}</span>
        )}
      </div>
    </div>
  );
}

// ── Status Control ─────────────────────────────────────────────────────────
// Wire up: replace the TODO comment with your real PATCH call.

type StatusState = "idle" | "saving" | "saved" | "error";

function StatusControl({
  token,
  initial,
}: {
  token: string;
  initial: LeadStatus;
}) {
  const [status, setStatus]       = useState<LeadStatus>(initial);
  const [saveState, setSaveState] = useState<StatusState>("idle");

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value as LeadStatus;
      setStatus(next);
      setSaveState("saving");

      try {
        // TODO: replace with your real endpoint when ready
        // await fetch(`${API_BASE}/api/leads/${token}/status`, {
        //   method: "PATCH",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ status: next }),
        // });
        await new Promise((r) => setTimeout(r, 600)); // placeholder delay
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 2500);
      }
    },
    [token],
  );

  return (
    <div className="status-section">
      <div className="status-label-row">
        <span className="sec-label" style={{ marginBottom: 0 }}>Status</span>
        {saveState === "saving" && (
          <span className="status-saving visible">Saving…</span>
        )}
        {saveState === "saved" && (
          <span className="status-saved visible">Saved ✓</span>
        )}
        {saveState === "error" && (
          <span className="status-saving visible" style={{ color: "#dc2626" }}>Error</span>
        )}
      </div>
      <select
        className="status-select"
        value={status}
        data-status={status}
        onChange={handleChange}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main portal ────────────────────────────────────────────────────────────

export default function LeadPortal({ token }: { token: string }) {
  const [data,    setData]    = useState<LeadData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/leads/${token}`)
      .then((r) => {
        if (r.status === 410) throw new Error("expired");
        if (!r.ok)           throw new Error("not_found");
        return r.json();
      })
      .then((d) => {
        setData({ ...d, messages: parseMessages(d.transcript ?? "") });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="screen-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="screen-center">
        <div className="error-wrap">
          <div className="error-icon">{error === "expired" ? "⏱" : "✕"}</div>
          <h1>{error === "expired" ? "Link expired" : "Lead not found"}</h1>
          <p>
            {error === "expired"
              ? "This link was valid for 72 hours and has now expired. Contact Oculon Systems for a new link."
              : "This link is invalid or has already been used."}
          </p>
          <a href="https://oculonsystems.com" className="home-link">oculonsystems.com</a>
        </div>
      </div>
    );
  }

  const scoreBarPct = Math.round(((data.scoreValue ?? 0) / 20) * 100);
  const createdAt   = new Date(data.createdAt).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const urgencyKey   = data.urgencyLevel?.toLowerCase() ?? "none";
  const urgencyBadge = URGENCY_BADGE[urgencyKey] ?? "badge-low";
  const urgencyLabel = URGENCY_LABEL[urgencyKey] ?? data.urgencyLevel ?? "Unknown";

  // Build a plain-English verdict sentence if the backend doesn't supply one
  const verdictText = data.verdict ?? (
    data.score === "hot"
      ? "Strong lead — recommend same-day contact."
      : data.score === "warm"
      ? "Promising lead — follow up within 24 hours."
      : "Low-priority lead — follow up when capacity allows."
  );

  return (
    <div className="portal">

      {/* ── Topbar ── */}
      <header className="portal-header">
        <div className="header-inner a1">
          <div className="header-left">
            <img
              src="https://www.oculonsystems.com/oculon-systems.png"
              alt="Oculon Systems"
              className="header-logo"
            />
            <div className="header-divider" />
            <div className="brand">
              <span className="brand-dot" />
              <span className="brand-name">Lead Portal</span>
              <span className="brand-sep">·</span>
              <span className="brand-sub">Iris</span>
            </div>
          </div>
          <button className="export-btn" onClick={() => exportToCSV(data)}>
            <DownloadIcon />
            Export CSV
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="portal-main">

        {/* Lead header */}
        <div className="lead-header a2">
          <h1 className="lead-name">{data.name}</h1>
          <div className="lead-meta-row">
            <span className={`badge badge-${data.score}`}>
              {data.score === "hot" ? "🔴" : data.score === "warm" ? "🟡" : "🔵"}&nbsp;
              {data.score.charAt(0).toUpperCase() + data.score.slice(1)} lead
            </span>
            {data.caseType && (
              <span className="badge badge-case">{data.caseType}</span>
            )}
            {data.urgencyLevel && data.urgencyLevel !== "none" && (
              <span className={`badge ${urgencyBadge}`}>{urgencyLabel}</span>
            )}
            <span className="badge badge-new">New</span>
            <span className="meta-date">{createdAt}</span>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="portal-grid">

          {/* ── LEFT ── */}
          <div className="portal-grid-left">

            {/* Assessment + summary */}
            <div className="card a3">
              <span className="sec-label">Iris's assessment</span>
              <div className="verdict">
                <p className="verdict-lead">{verdictText}</p>
                {data.scoreReason && (
                  <p className="verdict-body">{data.scoreReason}</p>
                )}
              </div>
              {data.summary && (
                <p className="summary-body">{data.summary}</p>
              )}
            </div>

            {/* Transcript */}
            {data.messages.length > 0 && (
              <div className="card a4">
                <span className="sec-label">Conversation transcript</span>
                <div className="transcript">
                  {data.messages.map((m, i) => (
                    <div key={i} className={`msg msg-${m.role}`}>
                      <span className="msg-role">
                        {m.role === "assistant" ? "Iris" : "Visitor"}
                      </span>
                      <p className="msg-content">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── RIGHT ── */}
          <div className="portal-grid-right">

            {/* Action card */}
            <div className="card a3">
              {data.phone ? (
                <a href={`tel:${data.phone}`} style={{ textDecoration: "none" }}>
                  <button className="btn-call">
                    <PhoneIcon size={16} />
                    Call {data.phone}
                  </button>
                </a>
              ) : (
                <button className="btn-call" disabled style={{ opacity: .45, cursor: "default" }}>
                  <PhoneIcon size={16} />
                  No phone provided
                </button>
              )}
              {data.email ? (
                <a href={`mailto:${data.email}`} style={{ textDecoration: "none" }}>
                  <button className="btn-email">
                    <MailIcon size={15} />
                    Send email
                  </button>
                </a>
              ) : (
                <button className="btn-email" disabled style={{ opacity: .45, cursor: "default" }}>
                  <MailIcon size={15} />
                  No email provided
                </button>
              )}

              {/* Status — wire to backend later */}
              <StatusControl token={token} initial={data.status ?? "new"} />
            </div>

            {/* Contact info */}
            <div className="card a4">
              <span className="sec-label">Contact</span>
              <div className="info-grid">
                <InfoRow icon={<UserIcon />}  label="Name"  value={data.name} />
                <InfoRow
                  icon={<PhoneIcon />} label="Phone"
                  value={data.phone ?? "Not provided"}
                  href={data.phone ? `tel:${data.phone}` : undefined}
                />
                <InfoRow
                  icon={<MailIcon />} label="Email"
                  value={data.email ?? "Not provided"}
                  href={data.email ? `mailto:${data.email}` : undefined}
                />
                {data.bestTime && (
                  <InfoRow icon={<ClockIcon />} label="Best time" value={data.bestTime} />
                )}
              </div>
            </div>

            {/* Lead intelligence */}
            <div className="card a5">
              <span className="sec-label">Lead intelligence</span>

              <div className="score-top">
                <div>
                  <div className="score-num">
                    {data.scoreValue}
                    <span className="score-den"> / 20</span>
                  </div>
                  <div className="score-sub">qualification score</div>
                </div>
                <span className={`badge badge-${data.score}`} style={{ marginTop: 4 }}>
                  {data.score.charAt(0).toUpperCase() + data.score.slice(1)}
                </span>
              </div>

              <div className="score-track">
                <div
                  className={`score-fill score-fill-${data.score}`}
                  style={{ width: `${scoreBarPct}%` }}
                />
              </div>

              <div className="intel-row">
                <span className="intel-label">Urgency</span>
                <span className="intel-value">
                  {URGENCY_LABEL[urgencyKey] ?? data.urgencyLevel ?? "—"}
                </span>
              </div>

              {data.caseType && (
                <div className="intel-row">
                  <span className="intel-label">Matter type</span>
                  <span className="intel-value">{data.caseType}</span>
                </div>
              )}

              {data.incidentDate && (
                <div className="intel-row">
                  <span className="intel-label">Incident date</span>
                  <span className="intel-value">{data.incidentDate}</span>
                </div>
              )}

              {data.policeReport != null && (
                <div className="intel-row">
                  <span className="intel-label">Police report</span>
                  <span className={`intel-value ${data.policeReport ? "intel-value-yes" : "intel-value-no"}`}>
                    {data.policeReport ? "Yes" : "No"}
                  </span>
                </div>
              )}

              {data.represented != null && (
                <div className="intel-row">
                  <span className="intel-label">Represented</span>
                  <span className={`intel-value ${data.represented ? "intel-value-no" : "intel-value-yes"}`}>
                    {data.represented ? "Yes — already has counsel" : "No"}
                  </span>
                </div>
              )}

              {data.urgencyReason && (
                <p className="meta-note">
                  <strong>Urgency:</strong> {data.urgencyReason}
                </p>
              )}
            </div>

          </div>
        </div>

        <footer className="portal-footer">
          <span>Powered by</span>
          <a href="https://oculonsystems.com" target="_blank" rel="noreferrer">
            Oculon Systems
          </a>
          <span>·</span>
          <span>Iris</span>
        </footer>
      </main>
    </div>
  );
}