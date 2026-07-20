// Favicon ديناميكي — رمز المشتقة الجزئية ∂ كأيقونة للموقع
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
        borderRadius: 7,
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          fontFamily: "Georgia, serif",
          lineHeight: 1,
          marginTop: 1,
        }}
      >
        ∂
      </span>
    </div>,
    { ...size }
  );
}
