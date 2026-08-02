import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadGloock } from "@remotion/google-fonts/Gloock";
import { loadFont as loadIS } from "@remotion/google-fonts/InstrumentSans";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { ScreenScene } from "./scenes/ScreenScene";
import { PAPER } from "./theme";

const gloock = loadGloock("normal", { weights: ["400"], subsets: ["latin"] });
const is = loadIS("normal", { weights: ["400", "700"], subsets: ["latin"] });

const T = () => (
  <TransitionSeries.Transition
    presentation={slide({ direction: "from-right" })}
    timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
  />
);

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: PAPER,
        fontFamily: `Gloock, ${gloock.fontFamily}`,
      }}
    >
      <style>{`
        @font-face { font-family: 'Gloock'; src: local('${gloock.fontFamily}'); }
      `}</style>
      <AbsoluteFill style={{ fontFamily: is.fontFamily }}>
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
              scroll={340}
              enterFrom="bottom"
            />
          </TransitionSeries.Sequence>
          <T />
          <TransitionSeries.Sequence durationInFrames={150}>
            <ScreenScene
              kicker="Player directory"
              title="Real players, near your court."
              src="images/3_players.jpg"
              scroll={420}
              enterFrom="right"
            />
          </TransitionSeries.Sequence>
          <T />
          <TransitionSeries.Sequence durationInFrames={140}>
            <ScreenScene
              kicker="Chat"
              title="Every match gets a group chat."
              src="images/4_chat.jpg"
              scroll={300}
              enterFrom="left"
              captionSide="bottom"
            />
          </TransitionSeries.Sequence>
          <T />
          <TransitionSeries.Sequence durationInFrames={130}>
            <ScreenScene
              kicker="Free courts"
              title="Play more, spend less."
              src="images/1_home.jpg"
              scroll={380}
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
