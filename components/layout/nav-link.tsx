"use client";

import Link, { type LinkProps } from "next/link";
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
      prefetch={false}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}