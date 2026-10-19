import { Link } from "@tanstack/react-router";

export function NotFoundComponent({
  title = "Page not found",
  message = "The page you're looking for doesn't exist or has been moved.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface-1 px-4 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-2"
            >
              Try Again
            </button>
          ) : (
            <Link
              to="/editor"
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface-1 px-4 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-2"
            >
              Back to Editor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
