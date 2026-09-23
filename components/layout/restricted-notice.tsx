import { Lock } from "lucide-react";

export function RestrictedNotice({ message }: { message: string }) {
  return (
    <div className="p-10 text-center max-w-sm mx-auto">
      <span className="grid place-items-center size-10 rounded-full bg-paper-line/60 text-slate mx-auto mb-3">
        <Lock className="size-4" />
      </span>
      <p className="text-sm text-slate">{message}</p>
    </div>
  );
}
