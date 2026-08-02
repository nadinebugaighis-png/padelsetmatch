import { loadFont as loadGloock } from "@remotion/google-fonts/Gloock";
import { loadFont as loadIS } from "@remotion/google-fonts/InstrumentSans";

const gloock = loadGloock("normal", { weights: ["400"], subsets: ["latin"] });
const is = loadIS("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const DISPLAY = gloock.fontFamily;
export const BODY = is.fontFamily;
