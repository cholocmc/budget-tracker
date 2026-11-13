import { ImageResponse } from "next/og";
import { LOGO_B_PATH } from "@/components/Icons";

// iOS home-screen icon. Same "B" mark as src/app/icon.svg, but square and
// full-bleed because iOS applies its own corner mask.
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
          backgroundImage: "linear-gradient(135deg, #3DF5A0, #16B8C9)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path d={LOGO_B_PATH} fill="#03140C" fillRule="evenodd" />
        </svg>
      </div>
    ),
    size,
  );
}
