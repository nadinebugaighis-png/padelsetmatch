import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { DISPLAY, BODY } from "../fonts";
import { INK, PLUM } from "../theme";

export const Caption: React.FC<{ kicker: string; title: string; delay?: number; align?: "left" | "center" }> = ({
  kicker,
  title,
  delay = 0,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const op = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const s2 = spring({ frame: frame - delay - 8, fps, config: { damping: 200 } });

  return (
    <div style={{ transform: `translateY(${y}px)`, opacity: op, textAlign: align }}>
      <div
        style={{
          fontFamily: BODY,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 4,
          color: PLUM,
          marginBottom: 14,
          opacity: interpolate(s2, [0, 1], [0, 1]),
        }}
      >
        {kicker.toUpperCase()}
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 78, lineHeight: 1.02, color: INK, maxWidth: 900 }}>{title}</div>
    </div>
  );
};
