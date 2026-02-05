import { Composition } from "remotion";
import { GameTrailer } from "./GameTrailer";
import { IntroSequence } from "./IntroSequence";
import { GameplayMontage } from "./GameplayMontage";
import { TikTokVideo } from "./TikTok";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* TikTok vertical video - 30 seconds */}
      <Composition
        id="TikTok"
        component={TikTokVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Intro"
        component={IntroSequence}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="GameplayMontage"
        component={GameplayMontage}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FullTrailer"
        component={GameTrailer}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
