import { ImageResponse } from "next/og";

export const alt = "Cheat Cook · 3D Studio & Visualizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF8F4",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(255, 100, 51, 0.16), transparent 50%), radial-gradient(circle at 15% 85%, rgba(47, 148, 99, 0.1), transparent 50%)",
        }}
      >
        {/* Brand Icon Box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "130px",
            height: "130px",
            borderRadius: "36px",
            background: "linear-gradient(135deg, rgba(255,100,51,0.2), #FFF1EA)",
            border: "2px solid rgba(255,100,51,0.4)",
            boxShadow: "0 20px 40px rgba(255,100,51,0.2)",
            marginBottom: "28px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="148.7 54 214 346"
            width="82"
            height="82"
          >
            <g transform="matrix(1, 0, 0, 1, 170.690338, 57.977947)">
              <circle cx="52" cy="62" r="34" stroke="#FF6433" strokeWidth="8" fill="#ffffff" />
              <circle cx="118" cy="62" r="34" stroke="#FF6433" strokeWidth="8" fill="#ffffff" />
              <circle cx="85" cy="40" r="38" stroke="#FF6433" strokeWidth="8" fill="#ffffff" />
              <path
                d="M 36 70 C 68.667 53.333 101.333 53.333 134 70 L 119.219 95.728 L 47.645 91.651 L 36 70 Z"
                fill="#ffffff"
              />
              <rect x="40" y="92" width="90" height="22" rx="8" fill="#FF6433" />
            </g>
            <g transform="matrix(1, 0, 0, 1, 135.690338, 167.977951)">
              <rect x="42" y="212" width="30" height="18" rx="9" fill="#FF6433" />
              <rect x="168" y="212" width="30" height="18" rx="9" fill="#FF6433" />
              <rect x="15" y="0" width="210" height="220" fill="#FF6433" rx="48" />
              <line
                x1="28"
                y1="80"
                x2="212"
                y2="80"
                stroke="#ffffff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />
              <rect x="188" y="28" width="14" height="36" rx="7" fill="#ffffff" />
              <rect x="188" y="104" width="14" height="64" rx="7" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: 900,
              color: "#0F172A",
              letterSpacing: "-0.03em",
            }}
          >
            Cheat Cook
          </span>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "#C2410C",
              backgroundColor: "rgba(255,100,51,0.15)",
              border: "2px solid rgba(255,100,51,0.35)",
              borderRadius: "9999px",
              padding: "6px 22px",
            }}
          >
            3D Studio
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: "26px",
            fontWeight: 500,
            color: "#475569",
            maxWidth: "860px",
            textAlign: "center",
            lineHeight: 1.45,
            margin: "0 0 32px 0",
          }}
        >
          Biblioteca y visor interactivo de modelos 3D en tiempo real con WebGL
        </p>

        {/* Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #F0E4DD",
              fontSize: "16px",
              fontWeight: 600,
              color: "#0F172A",
              boxShadow: "0 2px 8px rgba(60,24,8,0.06)",
            }}
          >
            📦 Modelos GLB Nativos
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #F0E4DD",
              fontSize: "16px",
              fontWeight: 600,
              color: "#0F172A",
              boxShadow: "0 2px 8px rgba(60,24,8,0.06)",
            }}
          >
            ⚡ Three.js / WebGL
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #F0E4DD",
              fontSize: "16px",
              fontWeight: 600,
              color: "#0F172A",
              boxShadow: "0 2px 8px rgba(60,24,8,0.06)",
            }}
          >
            ☁️ Supabase Cloud
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
