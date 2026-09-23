"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen grid place-items-center bg-paper font-sans p-6">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="text-sm text-slate mt-2">Please refresh the page. If this keeps happening, check your internet connection.</p>
          <button
            onClick={reset}
            className="mt-6 h-10 px-5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
