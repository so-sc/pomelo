"use client";

// Monaco served from our own bundle instead of @monaco-editor/react's default jsdelivr
// CDN, which exam networks often block. Languages register lazily, so only the ones a
// candidate opens are fetched (as chunks of our own static files). Browser-only, so
// code-editor.tsx loads this with ssr: false.
import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// The base editor worker covers C/C++/Java/Python, which only need tokenizing; the
// TS/JSON/CSS/HTML language services (and their workers) are never used here. This is
// the package's prebuilt, self-contained worker: the bundler serves it as a static
// asset, and it doesn't compile worker entries itself. The hashed name is tied to the
// pinned monaco-editor version; after an upgrade, the build fails until it's updated.
self.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL("monaco-editor/min/vs/assets/editor.worker-Be8ye1pW.js", import.meta.url)),
};

loader.config({ monaco });

export default Editor;
