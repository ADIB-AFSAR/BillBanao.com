import { useEffect, useState } from "react";

/** Starts `true` on the server/first render so SSR output matches a normal
 * connected client - the real value (and any offline UI) only kicks in
 * after mount, once `navigator.onLine` is available. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync initial browser online state on mount
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
