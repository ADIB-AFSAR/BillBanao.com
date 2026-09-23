"use client";

import { useEffect } from "react";
import { WifiOff, AlertTriangle, RotateCw, Home } from "lucide-react";

/**
 * Never render error.message on the page - it can be a raw Prisma/network
 * error (sometimes containing a hostname or port), which is both ugly and a
 * minor information leak. This only ever decides which of two friendly,
 * pre-written messages to show; the real message goes to the console for
 * developers, never to the DOM.
 */
function isConnectivityError(message: string): boolean {
  return /reach|network|fetch|connect|timeout|unreachable|offline|ECONN|ETIMEDOUT/i.test(message);
}

export function ErrorFallback({
  error,
  reset,
  context,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Short label for what failed to load, e.g. "dashboard" - optional, kept generic if omitted. */
  context?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const connectivity = isConnectivityError(error.message);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-sm w-full text-center">
        <span
          className={`grid place-items-center size-12 rounded-full mx-auto mb-4 ${
            connectivity ? "bg-amber/15 text-amber-dark" : "bg-brick-bg text-brick"
          }`}
        >
          {connectivity ? <WifiOff className="size-5" /> : <AlertTriangle className="size-5" />}
        </span>
        <h1 className="text-lg font-semibold text-ink">
          {connectivity ? "Can't reach the server" : "Something went wrong"}
        </h1>
        <p className="text-sm text-slate mt-2">
          {connectivity
            ? `Check your internet connection and try again${context ? ` to load ${context}` : ""}.`
            : "This page hit a problem loading. Trying again usually fixes it."}
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={reset}
            className="h-10 px-5 flex items-center gap-2 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink-2"
          >
            <RotateCw className="size-4" /> Try again
          </button>
          <a
            href="/dashboard"
            className="h-10 px-5 flex items-center gap-2 rounded-md border border-paper-line-2 text-sm font-medium text-ink hover:bg-paper-raised"
          >
            <Home className="size-4" /> Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
