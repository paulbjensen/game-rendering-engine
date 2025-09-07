import eventEmitter from "./eventEmitter";
import { InputDetector } from "./lib/inputDetector/InputDetector";

const inputDetector = new InputDetector({ eventEmitter });
export default inputDetector;
