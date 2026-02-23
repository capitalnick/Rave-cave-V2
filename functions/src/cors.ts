const PROD_ORIGINS = [
  "https://ravecave.app",
  "https://www.ravecave.app",
  "https://rave-cave-v2.vercel.app",
];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
];

const isDev =
  process.env.FUNCTIONS_EMULATOR === "true" ||
  process.env.NODE_ENV === "development";

export const ALLOWED_ORIGINS: string[] = isDev ?
  [...PROD_ORIGINS, ...DEV_ORIGINS] :
  PROD_ORIGINS;
