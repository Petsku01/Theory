import { ImageResponse } from "next/og";

export const alt = "Petteri Kosonen — IT operations, security and applied AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#101410", color: "#f1f0e8", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px 80px" }}>
      <div style={{ display: "flex", fontSize: 24, color: "#c5dd9d" }}>PETTERI KOSONEN / TURKU, FINLAND</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.05, letterSpacing: "-3px" }}>
        <span>Practical systems.</span><span style={{ color: "#c5dd9d" }}>Inspectable work.</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #52604f", paddingTop: 24, fontSize: 23 }}><span>IT operations · Security · Applied AI</span><span>petterikosonen.com</span></div>
    </div>,
    size,
  );
}
