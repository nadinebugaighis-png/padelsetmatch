import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { DISPLAY, BODY } from "../fonts";
import { INK, PLUM, GRASS } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(s, [0, 1], [0.82, 1]);
  const op = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const lineW = interpolate(spring({ frame: frame - 26, fps, config: { damping: 200 } }), [0, 1], [0, 420]);
  const tagOp = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(spring({ frame: frame - 40, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
        <Img
          src={staticFile("images/wordmark.png")}
          style={{ width: 820, transform: `scale(${logoScale})`, opacity: op }}
        />
        <div style={{ width: lineW, height: 4, background: GRASS, margin: "44px 0 40px", borderRadius: 4 }} />
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 66,
            color: INK,
            textAlign: "center",
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            lineHeight: 1.1,
          }}
        >
          Padel, but social.
        </div>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 5,
            color: PLUM,
            marginTop: 26,
            opacity: interpolate(frame, [54, 70], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          FIND A FOURTH · FILL A COURT
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
