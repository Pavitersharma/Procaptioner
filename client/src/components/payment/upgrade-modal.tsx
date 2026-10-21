import { useState } from "react";
import {
  Sparkles,
  Check,
  X,
  Zap,
  Lock,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUsage } from "@/lib/usage";
import { startRazorpayCheckout, type VerifyPaymentResult } from "@/lib/razorpay";
import { CREATOR_PRO_FEATURES } from "@/components/vyra/pricing";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  title = "Unlock Creator Pro",
  description = "Get unlimited access, watermark-free high-definition exports, and priority processing.",
}: UpgradeModalProps) {
  const { user, refreshUser } = useAuth();
  const { refreshUsage } = useUsage();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<VerifyPaymentResult | null>(null);

  if (!isOpen) return null;

  const handlePay = async () => {
    if (!user) {
      setErrorMessage("Please sign in first to subscribe to Creator Pro.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const userName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "Creator";

    await startRazorpayCheckout({
      userId: user.id,
      userEmail: user.email,
      userName,
      plan: "creator_pro",
      amountInr: 199,
      onSuccess: async (result) => {
        setIsProcessing(false);
        setSuccessResult(result);
        await Promise.all([refreshUser(), refreshUsage()]);
      },
      onError: (err) => {
        setIsProcessing(false);
        setErrorMessage(err);
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });
  };

  const handleClose = () => {
    if (isProcessing) return;
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/[0.14] bg-gradient-to-b from-[#131316] via-[#0e0e11] to-[#08080a] p-6 sm:p-8 z-10 shadow-2xl space-y-6">
        {/* Ambient Brand Glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff7a1a]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#ff7a1a]/10 blur-3xl pointer-events-none" />

        {/* Success Screen */}
        {successResult ? (
          <div className="relative z-10 py-8 text-center space-y-4">
            <div className="inline-grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome to Creator Pro!
              </h3>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                Your payment was verified successfully. All watermark-free exports, 5 GB cloud
                storage, and pro features are now active on your account.
              </p>
            </div>

            <div className="inline-block rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 font-mono text-xs text-neutral-400">
              Payment ID: <span className="text-white">{successResult.payment_id}</span>
            </div>

            <div className="pt-4 max-w-xs mx-auto">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[#ff7a1a] py-3 px-6 font-mono text-xs font-bold tracking-[0.14em] text-black uppercase shadow-lg shadow-orange-500/25 transition-all hover:bg-[#ff5b00] cursor-pointer"
              >
                Start Creating Now
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-3 py-0.5 font-mono text-[0.65rem] font-bold tracking-widest text-[#ff7a1a] uppercase shadow-sm shadow-orange-500/10">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>One Simple Plan</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {title}
                </h3>
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight">
                    ₹199
                  </span>
                  <span className="font-mono text-xs sm:text-sm text-neutral-400">
                    /month
                  </span>
                  <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-emerald-400 uppercase">
                    Test Mode
                  </span>
                </div>
                <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Features Checklist */}
            <div className="relative z-10 divide-y divide-white/[0.06]">
              {CREATOR_PRO_FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start justify-between gap-3 py-3 sm:py-3.5 first:pt-0 last:pb-0 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#ff7a1a]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-white">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[0.72rem] text-neutral-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#ff7a1a]/50 bg-[#ff7a1a]/15 text-[#ff7a1a] mt-0.5 shadow-sm shadow-orange-500/10">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment CTA */}
            <div className="relative z-10 pt-4 border-t border-white/[0.08] space-y-3">
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] py-3.5 px-6 font-mono text-xs sm:text-sm font-bold tracking-[0.14em] text-black uppercase shadow-lg shadow-orange-500/25 transition-all hover:bg-[#ff5b00] active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Opening Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-black" />
                    <span>Pay ₹199 with Razorpay</span>
                  </>
                )}
              </button>

              {/* Trust & Security Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[0.68rem] font-mono text-neutral-500 pt-1">
                <span className="flex items-center gap-1 text-neutral-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>100% Secure Checkout</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <Lock className="h-3 w-3 text-neutral-400" />
                  <span>UPI, Cards, NetBanking</span>
                </span>
                <span>•</span>
                <span className="text-neutral-400">Powered by Razorpay</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
