/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly GEMINI_API_KEY?: "AIzaSyDrzl7UzPbHkZtep2aIOgkqJCWgfntheYk";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
