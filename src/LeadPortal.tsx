import { useEffect, useState } from "react";
import "./portal.css";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://lex-chat-406813053868.us-central1.run.app";

type LeadData = {
  name: string;
  email: string | null;
  phone: string | null;
  caseType: string | null;
  summary: string | null;
  score: "hot" | "warm" | "cold";
  scoreValue: number;
  scoreReason: string | null;
  urgencyLevel: string | null;
  urgencyReason: string | null;
  createdAt: string;
  transcript: string;
  messages: { role: string; content: string }[]; // parsed client-side
};

const SCORE_CONFIG = {
  hot: {
    label: "Hot",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
  },
  warm: {
    label: "Warm",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  cold: {
    label: "Cold",
    color: "#6b9fd4",
    bg: "rgba(107,159,212,0.1)",
    border: "rgba(107,159,212,0.25)",
  },
};

const URGENCY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

function exportToCSV(data: LeadData) {
  const transcript = data.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/"/g, '""')}`)
    .join("\n");

  const rows = [
    ["Field", "Value"],
    ["Name", data.name],
    ["Email", data.email ?? ""],
    ["Phone", data.phone ?? ""],
    ["Case Type", data.caseType ?? ""],
    ["Score", `${data.score} (${data.scoreValue}/20)`],
    ["Score Reason", data.scoreReason ?? ""],
    ["Urgency", data.urgencyLevel ?? ""],
    ["Urgency Reason", data.urgencyReason ?? ""],
    ["Summary", data.summary ?? ""],
    ["Transcript", transcript],
    ["Created", data.createdAt],
  ];

  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lead-${data.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadPortal({ token }: { token: string }) {
  const [data, setData] = useState<LeadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/leads/${token}`)
      .then((r) => {
        if (r.status === 410) throw new Error("expired");
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((d) => {
        const messages = (d.transcript ?? "")
          .split(/\n\n(?=USER:|ASSISTANT:)/)
          .filter(Boolean)
          .map((block: string) => {
            const match = block.match(/^(USER|ASSISTANT):\s*([\s\S]*)/i);
            if (!match) return null;
            return {
              role:
                match[1].toLowerCase() === "assistant" ? "assistant" : "user",
              content: match[2].trim(),
            };
          })
          .filter(Boolean)
          .filter(
            (m: { role: string; content: string }) =>
              !m.content.includes("__INIT__") &&
              !m.content.includes("<LEAD_DATA>"),
          );

        setData({ ...d, messages });
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

  if (error) {
    return (
      <div className="screen-center">
        <div className="error-card">
          <div className="error-icon">{error === "expired" ? "⏱" : "✕"}</div>
          <h1>{error === "expired" ? "Link expired" : "Lead not found"}</h1>
          <p>
            {error === "expired"
              ? "This link was valid for 72 hours and has now expired. Contact Oculon Systems for a new link."
              : "This link is invalid or has already been used."}
          </p>
          <a href="https://oculonsystems.com" className="home-link">
            oculonsystems.com
          </a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreConf = SCORE_CONFIG[data.score ?? "cold"];
  const createdAt = new Date(data.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="portal">
      <header className="portal-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-dot" />
            <span className="brand-name">Oculon Systems</span>
            <span className="brand-sep">·</span>
            <span className="brand-sub">Lead Summary</span>
          </div>
          <button className="export-btn" onClick={() => exportToCSV(data)}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <main className="portal-main">
        {/* Hero */}
        <div className="lead-hero">
          <div className="lead-avatar">{data.name[0].toUpperCase()}</div>
          <div className="lead-identity">
            <h1 className="lead-name">{data.name}</h1>
            {data.caseType && (
              <span className="case-badge">{data.caseType}</span>
            )}
            <span className="created-at">{createdAt}</span>
          </div>
          <div
            className="score-badge"
            style={{
              color: scoreConf.color,
              background: scoreConf.bg,
              border: `1px solid ${scoreConf.border}`,
            }}
          >
            <span
              className="score-dot"
              style={{ background: scoreConf.color }}
            />
            {scoreConf.label} · {data.scoreValue}/20
          </div>
        </div>

        {/* Contact */}
        <section className="card">
          <h2 className="card-title">Contact</h2>
          <div className="info-grid">
            <InfoRow icon={<UserIcon />} label="Name" value={data.name} />
            <InfoRow
              icon={<MailIcon />}
              label="Email"
              value={data.email ?? "Not provided"}
              href={data.email ? `mailto:${data.email}` : undefined}
            />
            <InfoRow
              icon={<PhoneIcon />}
              label="Phone"
              value={data.phone ?? "Not provided"}
              href={data.phone ? `tel:${data.phone}` : undefined}
            />
          </div>
        </section>

        {/* Score & Urgency */}
        <section className="card">
          <h2 className="card-title">Lead Intelligence</h2>
          <div className="info-grid">
            <InfoRow
              icon={<StarIcon />}
              label="Score"
              value={`${scoreConf.label} (${data.scoreValue}/20)`}
            />
            <InfoRow
              icon={<AlertIcon />}
              label="Urgency"
              value={
                URGENCY_LABEL[data.urgencyLevel ?? "none"] ??
                data.urgencyLevel ??
                "—"
              }
            />
          </div>
          {data.scoreReason && (
            <p className="meta-note">
              <strong>Score:</strong> {data.scoreReason}
            </p>
          )}
          {data.urgencyReason && (
            <p className="meta-note">
              <strong>Urgency:</strong> {data.urgencyReason}
            </p>
          )}
        </section>

        {/* Summary */}
        {data.summary && (
          <section className="card">
            <h2 className="card-title">Case Summary</h2>
            <p className="summary-text">{data.summary}</p>
          </section>
        )}

        {/* Transcript */}
        {data.messages.length > 0 && (
          <section className="card">
            <h2 className="card-title">Conversation Transcript</h2>
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
          </section>
        )}

        <footer className="portal-footer">
          <span>Powered by</span>
          <a href="https://oculonsystems.com" target="_blank" rel="noreferrer">
            Oculon Systems
          </a>
        </footer>
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <span className="info-label">{label}</span>
      {href ? (
        <a href={href} className="info-value info-link">
          {value}
        </a>
      ) : (
        <span className="info-value">{value}</span>
      )}
    </div>
  );
}

const UserIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const PhoneIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const StarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const AlertIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
