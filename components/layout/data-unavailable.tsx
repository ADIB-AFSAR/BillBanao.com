import { WifiOff } from "lucide-react";
import Link from "next/link";

/**
 * Rendered by a page when its data fetch fails for a reason other than
 * "not signed in" - typically the server being reachable but its database
 * connection being briefly down or slow. The enclosing layout has already
 * confirmed the session is valid before this page ever runs, so this must
 * never redirect to /login: that would incorrectly sign an authenticated
 * person out just because a query timed out.
 */
export function DataUnavailable({
  message,
  retryHref,
}: {
  message: string;
  /** Path to retry - usually the current page. */
  retryHref: string;
}) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-sm rounded-lg border border-paper-line-2 bg-paper-raised p-6 text-center">
        <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-amber/15 text-amber-dark">
          <WifiOff className="size-4.5" />
        </span>
        <p className="text-sm text-ink-2">{message}</p>
        <Link
          href={retryHref}
          className="mt-4 inline-block h-10 rounded-md bg-ink px-5 text-sm font-medium leading-10 text-paper hover:bg-ink-2"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
