export const APP_TIME_ZONE = "Asia/Kolkata";

type DateInput = Date | string | number;

export function formatDateTime(value: DateInput): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  });
}

export function formatDate(value: DateInput): string {
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
    timeZone: APP_TIME_ZONE,
  });
}