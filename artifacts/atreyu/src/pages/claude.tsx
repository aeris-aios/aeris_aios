import { ExternalLink } from "lucide-react";
import { useTheme } from "@/contexts/theme";

const TARGET_URL = "https://antigravity.google/";

export default function ClaudeCode() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const bg    = isLight ? "#e8ecf4" : "#0f111a";
  const dark  = isLight ? "#b0b7ca" : "#07090e";
  const lite  = isLight ? "#ffffff" : "#1a1e2e";
  const inset = `inset 5px 5px 14px ${dark}, inset -5px -5px 14px ${lite}`;
  const raised = `5px 5px 14px ${dark}, -5px -5px 14px ${lite}`;

  return (
    <div style={{
      margin: "-32px -32px -32px -32px",
      height: "calc(100vh - 110px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      boxShadow: inset,
      borderRadius: 16,
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        textAlign: "center",
        padding: "0 32px",
        maxWidth: 480,
      }}>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: bg, boxShadow: raised,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 28 }}>🚀</span>
        </div>

        {/* Title */}
        <div>
          <div style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: isLight ? "#1e2030" : "#c8d0e0",
            marginBottom: 8,
          }}>
            Google Antigravity
          </div>
          <div style={{
            fontFamily: "var(--app-font-mono)",
            fontSize: 11, letterSpacing: "0.06em",
            color: isLight ? "#7a82a0" : "#4a5270",
            lineHeight: 1.7,
          }}>
            This site cannot be embedded — Google blocks<br />
            all iframe embedding via security policy.
          </div>
        </div>

        {/* Open button */}
        <a
          href={TARGET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 12,
            background: bg, boxShadow: raised,
            textDecoration: "none",
            fontFamily: "var(--app-font-mono)",
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#e67e41",
            cursor: "pointer",
            transition: "box-shadow 0.15s ease",
          }}
        >
          <ExternalLink style={{ width: 13, height: 13 }} />
          Open Antigravity
        </a>

      </div>
    </div>
  );
}
