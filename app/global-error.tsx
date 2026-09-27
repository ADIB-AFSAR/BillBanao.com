"use client";

import { useEffect } from "react";
import "./globals.css";
import { isChunkLoadError, reloadToRecoverChunk } from "@/components/pwa/chunk-error-recovery";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const chunkFailure = isChunkLoadError(error.message) || error.name === "ChunkLoadError";

  return (
    <html lang="en">
      <body className="min-h-screen grid place-items-center bg-paper font-sans p-6">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-ink">
            {chunkFailure ? "Couldn't load a required file" : "Something went wrong"}
          </h1>
          <p className="text-sm text-slate mt-2">
            {chunkFailure
              ? "This usually means the connection dropped while a piece of the app was loading. Reloading almost always fixes it."
              : "Please refresh the page. If this keeps happening, check your internet connection."}
          </p>
          <button
            onClick={() => {
              // See components/pwa/chunk-error-recovery.tsx - reset() can't
              // retry a JS chunk the browser already failed to fetch; only
              // a real reload, back through the service worker, can.
              if (chunkFailure) {
                reloadToRecoverChunk();
              } else {
                reset();
              }
            }}
            className="mt-6 h-10 px-5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
