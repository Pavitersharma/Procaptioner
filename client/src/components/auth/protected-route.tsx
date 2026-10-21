import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/dashboard";
      const target = redirectTo || currentPath;

      navigate({
        to: "/signin",
        search: { redirect: target } as unknown as Record<string, string>,
      });
    }
  }, [user, loading, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#070707] text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <ProCaptionerLogo size="lg" theme="dark" />
          <div className="flex items-center gap-2 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff7a1a]" />
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
              Verifying session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
