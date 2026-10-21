/**
 * Razorpay Payment Integration Helper
 * Handles dynamic script loading, order creation, checkout modal, and signature verification.
 */

const API_BASE = "http://localhost:8000";

export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_TqW64p9kuj4qLc";

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: string;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  plan: string;
  order_id: string;
  payment_id: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

/**
 * Dynamically loads the official Razorpay checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface StartCheckoutOptions {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  plan?: string;
  amountInr?: number;
  onSuccess: (result: VerifyPaymentResult) => void;
  onError: (errorMessage: string) => void;
  onDismiss?: () => void;
}

/**
 * Launches the Razorpay checkout flow:
 * 1. Creates an order on backend
 * 2. Opens the Razorpay modal
 * 3. Verifies signature on completion
 */
export async function startRazorpayCheckout(opts: StartCheckoutOptions): Promise<void> {
  const {
    userId,
    userEmail,
    userName,
    plan = "creator_pro",
    amountInr = 199,
    onSuccess,
    onError,
    onDismiss,
  } = opts;

  // 1. Ensure checkout script is loaded
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || !window.Razorpay) {
    onError("Could not load payment gateway. Please check your internet connection.");
    return;
  }

  // 2. Create order on backend
  let orderData: RazorpayOrderResponse;
  try {
    const res = await fetch(`${API_BASE}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        user_id: userId,
        user_email: userEmail || "",
        amount_inr: amountInr,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create payment order.");
    }

    orderData = await res.json();
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : "Error initiating payment.");
    return;
  }

  // 3. Open Razorpay Checkout modal
  const razorpayOptions = {
    key: orderData.key_id || RAZORPAY_KEY_ID,
    amount: orderData.amount,
    currency: orderData.currency || "INR",
    name: "ProCaptioner",
    description: "Creator Pro Plan (₹199 / month)",
    order_id: orderData.order_id,
    prefill: {
      name: userName || "Creator",
      email: userEmail || "",
    },
    notes: {
      plan,
      user_id: userId,
    },
    theme: {
      color: "#ff7a1a",
      backdrop_color: "rgba(0, 0, 0, 0.85)",
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
      escape: true,
      backdropclose: false,
    },
    handler: async (response: RazorpayPaymentSuccessResponse) => {
      // 4. Verify signature on backend
      try {
        const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            user_id: userId,
            plan,
          }),
        });

        if (!verifyRes.ok) {
          const verifyErr = await verifyRes.json().catch(() => ({}));
          throw new Error(verifyErr.detail || "Payment verification failed.");
        }

        const verifyData: VerifyPaymentResult = await verifyRes.json();
        onSuccess(verifyData);
      } catch (verifyError: unknown) {
        onError(
          verifyError instanceof Error
            ? verifyError.message
            : "Payment verification failed. Please contact support.",
        );
      }
    },
  };

  try {
    const rzp = new window.Razorpay(razorpayOptions);
    rzp.open();
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : "Could not open checkout modal.");
  }
}
