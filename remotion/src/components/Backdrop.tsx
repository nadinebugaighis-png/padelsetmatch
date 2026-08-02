import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { PAPER, GRASS, PLUM } from "../theme";

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const a = Math.sin(frame / 90);
  const b = Math.cos(frame / 120);
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          borderRadius: "50%",
          left: -500 + a * 40,
          top: -300 + b * 60,
          background: `radial-gradient(circle at 50% 50%, ${GRASS}44, transparent 62%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          right: -520 - a * 50,
          bottom: -420 + b * 40,
          background: `radial-gradient(circle at 50% 50%, ${PLUM}26, transparent 62%)`,
          filter: "blur(20px)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [0, 30], [0, 0.5], { extrapolateRight: "clamp" }),
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(15,62,46,0.035) 0 1px, transparent 1px 46px), repeating-linear-gradient(90deg, rgba(15,62,46,0.035) 0 1px, transparent 1px 46px)",
        }}
      />
    </AbsoluteFill>
  );
};
