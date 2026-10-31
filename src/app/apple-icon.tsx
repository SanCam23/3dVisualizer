import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFF8F4 0%, #FFF1EA 100%)",
          borderRadius: "40px",
          border: "4px solid rgba(255, 100, 51, 0.4)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="148.7 54 214 346"
          width="120"
          height="120"
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
    ),
    { ...size }
  );
}

