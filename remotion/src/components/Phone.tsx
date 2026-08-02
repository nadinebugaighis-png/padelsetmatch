import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { INK, PAPER2 } from "../theme";

type Props = {
  src: string;
  /** how far the screen scrolls over the scene, in px of the source image */
  scroll?: number;
  enterFrom?: "right" | "left" | "bottom";
  y?: number;
  scale?: number;
};

export const Phone: React.FC<Props> = ({ src, scroll = 260, enterFrom = "right", y = 0, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 200 } });
  const dir = enterFrom === "left" ? -1 : 1;
  const tx = enterFrom === "bottom" ? 0 : interpolate(s, [0, 1], [dir * 420, 0]);
  const ty = enterFrom === "bottom" ? interpolate(s, [0, 1], [420, 0]) : 0;
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  const W = 560 * scale;
  const H = 1150 * scale;
  const R = 60 * scale;

  const drift = Math.sin(frame / 70) * 6;
  const scrollY = interpolate(frame, [10, 150], [0, -scroll], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          transform: `translate(${tx}px, ${ty + y + drift}px)`,
          opacity,
          width: W,
          height: H,
          borderRadius: R,
          background: INK,
          padding: 12 * scale,
          boxShadow: "0 60px 120px rgba(15,62,46,0.28), 0 12px 30px rgba(15,62,46,0.16)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: R - 12 * scale,
            overflow: "hidden",
            background: PAPER2,
            position: "relative",
          }}
        >
          <Img
            src={staticFile(src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `50% ${pan}%`,
              display: "block",
            }}
          />

        </div>
      </div>
    </AbsoluteFill>
  );
};
