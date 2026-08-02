import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Phone } from "../components/Phone";
import { Caption } from "../components/Caption";

type Props = {
  kicker: string;
  title: string;
  src: string;
  scroll?: number;
  enterFrom?: "right" | "left" | "bottom";
  captionSide?: "top" | "bottom";
};

export const ScreenScene: React.FC<Props> = ({
  kicker,
  title,
  src,
  scroll = 260,
  enterFrom = "right",
  captionSide = "top",
}) => {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone src={src} scroll={scroll} enterFrom={enterFrom} y={captionSide === "top" ? 130 : -110} scale={0.94} />
      <AbsoluteFill
        style={{
          padding: "86px 80px",
          justifyContent: captionSide === "top" ? "flex-start" : "flex-end",
        }}
      >
        <Caption kicker={kicker} title={title} delay={10} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
