import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { DISPLAY, BODY } from "../fonts";
import { INK, PAPER, PLUM, GRASS } from "../theme";

const Pill: React.FC<{ text: string; delay: number; bg: string; color: string }> = ({ text, delay, bg, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  return (
    <div
      style={{
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        opacity: interpolate(frame - delay, [0, 12], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
        background: bg,
        color,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: 1,
        padding: "18px 34px",
        borderRadius: 999,
        margin: 8,
      }}
    >
      {text}
    </div>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const op = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
        <Img
          src={staticFile("images/icon.png")}
          style={{
            width: 240,
            borderRadius: 54,
            opacity: op,
            transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
            boxShadow: "0 30px 60px rgba(15,62,46,0.22)",
          }}
        />
        <Img src={staticFile("images/wordmark.png")} style={{ width: 620, marginTop: 46, opacity: op }} />

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: 54, maxWidth: 900 }}>
          <Pill text="Open matches" delay={20} bg={INK} color={PAPER} />
          <Pill text="Player directory" delay={30} bg={PLUM} color={PAPER} />
          <Pill text="Group chat" delay={40} bg={GRASS} color={INK} />
          <Pill text="Free courts" delay={50} bg={INK} color={PAPER} />
        </div>

        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 64,
            color: INK,
            marginTop: 70,
            opacity: interpolate(frame, [58, 76], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          padelsetmatch.com
        </div>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 5,
            color: PLUM,
            marginTop: 20,
            opacity: interpolate(frame, [70, 88], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          MADRID · ES / EN / FR
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
