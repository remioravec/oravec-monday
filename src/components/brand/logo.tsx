import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
};

export function Logo({
  variant = "dark",
  showWordmark = true,
  className,
}: LogoProps) {
  const onLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl shadow-sm",
          onLight ? "bg-white" : "bg-blue-600 text-white",
        )}
      >
        <CheckCircle2
          className={cn("size-5", onLight ? "text-green-500" : "text-white")}
          strokeWidth={2.5}
        />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            onLight ? "text-white" : "text-foreground",
          )}
        >
          Oravec
        </span>
      )}
    </div>
  );
}
