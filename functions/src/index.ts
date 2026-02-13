import {setGlobalOptions} from "firebase-functions/v2";

setGlobalOptions({maxInstances: 10});

export {tts} from "./tts";
export {gemini} from "./gemini";
export {queryInventory} from "./queryInventory";
export {onWineWrite} from "./onWineWrite";
export {backfillEmbeddings} from "./backfillEmbeddings";
