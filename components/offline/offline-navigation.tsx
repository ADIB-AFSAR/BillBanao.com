"use client";

import { useEffect } from "react";

export function OfflineNavigation() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (navigator.onLine) return;
      if (event.button !== 0) return;

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) return;

      const link = target.closest("a");

      if (!link) return;

      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin) return;

      event.preventDefault();

      window.location.assign(url.href);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}