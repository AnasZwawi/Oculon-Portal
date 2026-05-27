import { useEffect, useState } from "react";
import "./portal.css";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "https://api.oculonsystems.com";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type LeadData = {
  sessionId: string;
  leadScore: "hot" | "warm" | "cold" | null;
  messages: Message[];
  practiceAreas: string[];
  clientName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  caseType?: string;
  summary?: string;
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

function exportToCSV(data: LeadData) {
  const transcript = (data.messages ?? [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/"/g, '""')}`)
    .join("\n");

  const rows = [
    ["Field", "Value"],
    ["Name", data.contactName ?? ""],
    ["Email", data.contactEmail ?? ""],
    ["Phone", data.contactPhone ?? ""],
    ["Case Type", data.caseType ?? ""],
    ["Lead Score", data.leadScore ?? ""],
    ["Practice Areas", (data.practiceAreas ?? []).join(", ")],
    ["Summary", data.summary ?? ""],
    ["Transcript", transcript],
    ["Session ID", data.sessionId],
  ];

  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lead-${data.contactName?.replace(/\s+/g, "-").toLowerCase() ?? data.sessionId.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadPortal({ token }: { token: string }) {
  const [data, setData] = useState<LeadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: remove mock
    setData({
      sessionId: "abc123-def456",
      leadScore: "hot",
      practiceAreas: ["Personal Injury"],
      contactName: "Maria Santos",
      contactEmail: "maria@example.com",
      contactPhone: "(305) 555-0192",
      caseType: "Personal Injury",
      summary:
        "Maria was rear-ended on I-95 on May 20th. She sustained neck and back injuries and was taken to Jackson Memorial. The other driver's insurance has made contact but she hasn't signed anything.",
      messages: [
        {
          role: "assistant",
          content: "Hi, I'm Iris. What brings you here today?",
        },
        {
          role: "user",
          content: "I was in a car accident last week and I need a lawyer",
        },
        {
          role: "assistant",
          content: "I'm sorry to hear that. Can you tell me what happened?",
        },
        {
          role: "user",
          content:
            "Someone hit me from behind on the highway. I have neck and back pain.",
        },
      ],
    });
    setLoading(false);
  }, []);

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

  const score = data.leadScore ?? "cold";
  const scoreConf = SCORE_CONFIG[score];
  const cleanMessages = (data.messages ?? []).filter(
    (m) =>
      m.role === "user" ||
      (m.role === "assistant" && !m.content.includes("__INIT__")),
  );

  return (
    <div className="portal">
      {/* Header */}
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
        {/* Lead identity block */}
        <div className="lead-hero">
          <div className="lead-avatar">
            {(data.contactName ?? "?")[0].toUpperCase()}
          </div>
          <div className="lead-identity">
            <h1 className="lead-name">{data.contactName ?? "Unknown"}</h1>
            {data.caseType && (
              <span className="case-badge">{data.caseType}</span>
            )}
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
            {scoreConf.label}
          </div>
        </div>

        {/* Contact info */}
        <section className="card">
          <h2 className="card-title">Contact</h2>
          <div className="info-grid">
            <InfoRow
              icon={
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
              }
              label="Name"
              value={data.contactName ?? "—"}
            />
            <InfoRow
              icon={
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
              }
              label="Email"
              value={data.contactEmail ?? "Not provided"}
              href={
                data.contactEmail ? `mailto:${data.contactEmail}` : undefined
              }
            />
            <InfoRow
              icon={
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
              }
              label="Phone"
              value={data.contactPhone ?? "Not provided"}
              href={data.contactPhone ? `tel:${data.contactPhone}` : undefined}
            />
          </div>
        </section>

        {/* Summary */}
        {data.summary && (
          <section className="card">
            <h2 className="card-title">Case Summary</h2>
            <p className="summary-text">{data.summary}</p>
          </section>
        )}

        {/* Transcript */}
        <section className="card">
          <h2 className="card-title">Conversation Transcript</h2>
          <div className="transcript">
            {cleanMessages.map((m, i) => (
              <div key={i} className={`msg msg-${m.role}`}>
                <span className="msg-role">
                  {m.role === "assistant" ? "Iris" : "Visitor"}
                </span>
                <p className="msg-content">{m.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="portal-footer">
          <span>Powered by</span>
          <a href="https://oculonsystems.com" target="_blank" rel="noreferrer">
            Oculon Systems
          </a>
          <span className="footer-sep">·</span>
          <span>Session {data.sessionId.slice(0, 8)}…</span>
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
