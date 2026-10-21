import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";
import { supabase } from "@/lib/supabase";

interface SignupFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface SignupFormTouched {
  fullName?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — ProCaptioner" },
      {
        name: "description",
        content: "Start generating AI captions in seconds with ProCaptioner.",
      },
    ],
  }),
  component: SignUpPage,
});

export function SignUpPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [touched, setTouched] = useState<SignupFormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validate = (values: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): SignupFormErrors => {
    const newErrors: SignupFormErrors = {};

    if (!values.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (values.fullName.trim().length < 2) {
      newErrors.fullName = "Please enter your full name";
    }

    if (!values.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!values.password) {
      newErrors.password = "Password is required";
    } else if (values.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!values.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (values.confirmPassword !== values.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleBlur = (field: keyof SignupFormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validate({ fullName, email, password, confirmPassword });
    setErrors((prev) => ({
      ...prev,
      [field]: currentErrors[field],
    }));
  };

  const handleChange = (field: keyof SignupFormErrors, val: string) => {
    if (field === "fullName") setFullName(val);
    if (field === "email") setEmail(val);
    if (field === "password") setPassword(val);
    if (field === "confirmPassword") setConfirmPassword(val);

    if (touched[field]) {
      const updatedValues = {
        fullName,
        email,
        password,
        confirmPassword,
        [field]: val,
      };
      const currentErrors = validate(updatedValues);
      setErrors((prev) => ({
        ...prev,
        [field]: currentErrors[field],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    const validationErrors = validate({
      fullName,
      email,
      password,
      confirmPassword,
    });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      setAuthError(null);
      setSuccessMsg(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      setIsSubmitting(false);

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        navigate({ to: getRedirectTarget() as any });
      } else {
        setSuccessMsg(
          "Account registered! If confirmation is required, please check your email inbox to verify."
        );
        setTimeout(() => {
          navigate({ to: getRedirectTarget() as any });
        }, 3000);
      }
    }
  };

  const getRedirectTarget = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("redirect");
      if (r && r.startsWith("/")) return r;
    }
    return "/dashboard";
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const dest = getRedirectTarget();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${dest}`,
      },
    });
    if (error) setAuthError(error.message);
  };

  const handleFacebookLogin = async () => {
    setAuthError(null);
    const dest = getRedirectTarget();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}${dest}`,
      },
    });
    if (error) setAuthError(error.message);
  };

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-foreground selection:bg-[#ff7a00] selection:text-black overflow-hidden"
      style={{
        backgroundColor: "#070707",
        backgroundImage:
          "radial-gradient(ellipse 65% 55% at 50% 48%, rgba(55, 30, 10, 0.28) 0%, rgba(7, 7, 7, 0.95) 70%, #070707 100%)",
      }}
    >
      {/* Background ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-15 blur-[120px]"
        style={{ background: "radial-gradient(circle, #FF7A1A 0%, transparent 70%)" }}
      />

      {/* ── Top Logo ── */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center transition-opacity duration-200 hover:opacity-85"
          aria-label="ProCaptioner Home"
        >
          <ProCaptionerLogo size="xl" theme="dark" />
        </Link>
      </div>

      {/* ── Auth Card ── */}
      <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#121212]/95 p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-[1.7rem] font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-400">
            Start generating AI captions in seconds
          </p>
        </div>

        {/* Form with custom validation (no required attribute) */}
        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
          {/* Supabase Error Alert */}
          {authError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Supabase Success Alert */}
          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Full name</label>
            <div className="relative flex items-center">
              <User
                className={`pointer-events-none absolute left-3.5 h-4 w-4 transition-colors ${
                  errors.fullName ? "text-red-400" : "text-neutral-500"
                }`}
              />
              <input
                type="text"
                value={fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
                placeholder="John Doe"
                className={`w-full rounded-lg border bg-[#090909] py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none ${
                  errors.fullName
                    ? "border-red-500/80 bg-red-500/[0.03] focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                    : "border-neutral-800 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00]"
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email</label>
            <div className="relative flex items-center">
              <Mail
                className={`pointer-events-none absolute left-3.5 h-4 w-4 transition-colors ${
                  errors.email ? "text-red-400" : "text-neutral-500"
                }`}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className={`w-full rounded-lg border bg-[#090909] py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none ${
                  errors.email
                    ? "border-red-500/80 bg-red-500/[0.03] focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                    : "border-neutral-800 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00]"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock
                className={`pointer-events-none absolute left-3.5 h-4 w-4 transition-colors ${
                  errors.password ? "text-red-400" : "text-neutral-500"
                }`}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Min 6 characters"
                className={`w-full rounded-lg border bg-[#090909] py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none ${
                  errors.password
                    ? "border-red-500/80 bg-red-500/[0.03] focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                    : "border-neutral-800 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Confirm password
            </label>
            <div className="relative flex items-center">
              <Lock
                className={`pointer-events-none absolute left-3.5 h-4 w-4 transition-colors ${
                  errors.confirmPassword ? "text-red-400" : "text-neutral-500"
                }`}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="Re-enter your password"
                className={`w-full rounded-lg border bg-[#090909] py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none ${
                  errors.confirmPassword
                    ? "border-red-500/80 bg-red-500/[0.03] focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                    : "border-neutral-800 focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff7a00] py-3 font-mono text-xs font-bold tracking-[0.18em] text-black uppercase transition-all duration-150 hover:bg-[#ff881a] active:scale-[0.99] cursor-pointer shadow-lg shadow-orange-500/10 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              <>
                <span>CREATE ACCOUNT</span>
                <span className="text-sm leading-none font-bold">→</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-neutral-800/80" />
            <span className="absolute bg-[#121212] px-3 font-sans text-xs text-neutral-500 font-medium">
              OR
            </span>
          </div>

          {/* Social Logins */}
          <div className="space-y-2.5">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-[#0e0e0e]/70 py-2.5 px-4 text-xs font-medium text-white transition-all hover:bg-neutral-800/50 hover:border-neutral-700 active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-[#0e0e0e]/70 py-2.5 px-4 text-xs font-medium text-white transition-all hover:bg-neutral-800/50 hover:border-neutral-700 active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Footer Link ── */}
      <p className="mt-7 text-center text-xs sm:text-sm text-neutral-400">
        Already have an account?{" "}
        <Link
          to="/login"
          search={{ redirect: getRedirectTarget() } as any}
          className="font-semibold text-[#ff7a00] transition-colors hover:text-[#ff9233] hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
