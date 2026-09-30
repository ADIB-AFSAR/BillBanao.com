"use client";

import Link, { useLinkStatus, type LinkProps } from "next/link";
import type {
  AnchorHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

type NavLinkProps = LinkProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof LinkProps | "href"
  > & {
    children: ReactNode;
  };

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin transition-opacity duration-150 ${
        pending ? "opacity-100 delay-100" : "opacity-0"
      }`}
    />
  );
}

export function NavLink({
  href,
  onClick,
  children,
  ...props
}: NavLinkProps) {
  function handleClick(
    event: MouseEvent<HTMLAnchorElement>
  ) {
    onClick?.(event);

    if (event.defaultPrevented) return;

    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      event.preventDefault();

      if (typeof href === "string") {
        window.location.assign(href);
      }
    }
  }

  return (
    <Link
      href={href}
      // prefetch={false}
      onClick={handleClick}
      {...props}
    >
      {children}
      <PendingIndicator/>
    </Link>
  );
}