"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type NavLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode;
  };

/**
 * Drop-in replacement for next/link used in the sidebar and mobile drawer.
 *
 * A normal <Link> click does a client-side transition: Next.js fetches
 * just that page's data, tagged with router-internal headers. The service
 * worker can't pre-cache that exact request (those headers aren't
 * something we can predict ahead of time), so offline it has to fail and
 * hope Next's own recovery path falls back to a real navigation - which in
 * practice was landing on the browser's own offline page instead.
 *
 * A real page load, by contrast, is exactly what OfflineRouteWarmer
 * pre-fetches and the service worker caches. So when we're offline, skip
 * the client-side transition entirely and go straight to a real
 * navigation - it's the one path that's actually reliable with no
 * connection.
 */
export function NavLink({ href, onClick, children, ...props }: NavLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      event.preventDefault();
      window.location.assign(typeof href === "string" ? href : href.toString());
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
