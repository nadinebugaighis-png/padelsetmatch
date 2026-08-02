import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { DISPLAY, BODY } from "./fonts";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { ScreenScene } from "./scenes/ScreenScene";
import { PAPER } from "./theme";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: PAPER,
        fontFamily: BODY,
      }}
    >
      <AbsoluteFill style={{ fontFamily: BODY }}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={110}>
            <Intro />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
          />
          <TransitionSeries.Sequence durationInFrames={150}>
            <ScreenScene
              kicker="Open matches"
              title="See who's playing tonight."
              src="images/2_matches.jpg"
              scroll={55}
              enterFrom="bottom"
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />
          <TransitionSeries.Sequence durationInFrames={150}>
            <ScreenScene
              kicker="Player directory"
              title="Real players, near your court."
              src="images/3_players.jpg"
              scroll={70}
              enterFrom="right"
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />
          <TransitionSeries.Sequence durationInFrames={140}>
            <ScreenScene
              kicker="Chat"
              title="Every match gets a group chat."
              src="images/4_chat.jpg"
              scroll={45}
              enterFrom="left"
              captionSide="bottom"
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />
          <TransitionSeries.Sequence durationInFrames={130}>
            <ScreenScene
              kicker="Free courts"
              title="Play more, spend less."
              src="images/6_how.jpg"
              scroll={60}
              enterFrom="right"
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />
          <TransitionSeries.Sequence durationInFrames={150}>
            <Outro />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
