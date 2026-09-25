/**
 * Wraps a promise so it rejects after `ms` milliseconds if it hasn't
 * settled yet.
 *
 * Server actions are plain POST requests, so the offline service worker
 * (public/sw.js) deliberately leaves them alone - they succeed or fail
 * entirely on their own. That's fine when DevTools *simulates* being
 * offline (Chrome fails those requests almost instantly), but an actual
 * Wi-Fi drop is often much slower for the OS to report - the browser can
 * spend many seconds trying to resolve DNS or open a connection before it
 * gives up. Without this, a list page would just hang for that whole time
 * instead of falling back to the cached data that's sitting right there.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}