import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Compass,
  HeartHandshake,
  KeyRound,
  Mail,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { normalizeEmail, isValidKietEmail } from "@/utils/validators";

const CAMPUS_LOGIN_IMAGE =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85";

export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // 'email' | 'otp' | 'name'
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devOtpHint, setDevOtpHint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpInputsRef = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);

    if (!isValidKietEmail(cleanEmail)) {
      toast.error("Please enter a valid @kiet.edu email address or harshitagrahari33@gmail.com");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestOtp(cleanEmail);
      if (res.data?.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
      toast.success(res.data?.message || `Verification code sent to ${cleanEmail}! Please check your inbox.`);
      setStep("otp");
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK" || !err.response
          ? "Cannot connect to backend server. Make sure the backend is running on port 5001."
          : "Failed to send verification code");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtpToEmail = async (targetEmail) => {
    const cleanEmail = normalizeEmail(targetEmail);
    setEmail(cleanEmail);
    setIsSubmitting(true);
    try {
      const res = await requestOtp(cleanEmail);
      if (res.data?.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
      toast.success(res.data?.message || `Verification code sent to ${cleanEmail}! Please check your inbox.`);
      setStep("otp");
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK" || !err.response
          ? "Cannot connect to backend server. Make sure the backend is running on port 5001."
          : "Failed to send verification code");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    // If multiple digits entered or pasted into this input
    if (sanitized.length > 1) {
      const updated = [...otp];
      const digits = sanitized.slice(0, 6).split("");
      digits.forEach((d, i) => {
        if (i < 6) updated[i] = d;
      });
      setOtp(updated);
      const nextIndex = Math.min(digits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    // Single digit entry
    const updated = [...otp];
    updated[index] = sanitized;
    setOtp(updated);

    // Auto advance to next box
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split("");
    const updated = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) updated[i] = d;
    });
    setOtp(updated);

    const nextIndex = Math.min(digits.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    const fullOtp = otp.join("").trim();
    if (fullOtp.length !== 6) {
      toast.error("Please enter all 6 digits of the code");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOtp(cleanEmail, fullOtp);
      if (res.data?.needsName) {
        setStep("name");
      } else {
        toast.success("Welcome back to campus!");
        navigate("/");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired OTP";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullOtp = otp.join("").trim();
      await verifyOtp(cleanEmail, fullOtp, name.trim());
      toast.success("Profile created! Welcome to KIET Lost & Found.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to finalize account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    const cleanEmail = normalizeEmail(email);
    try {
      const res = await requestOtp(cleanEmail);
      if (res.data?.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
      toast.success(res.data?.message || "New verification code sent!");
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to resend OTP");
    }
  };

  const handleQuickLogin = async (demoEmail, demoName) => {
    setIsSubmitting(true);
    const cleanEmail = normalizeEmail(demoEmail);
    try {
      setEmail(cleanEmail);
      const reqRes = await requestOtp(cleanEmail);
      const devOtp = reqRes.data?.devOtp;

      if (devOtp) {
        await verifyOtp(demoEmail, devOtp, demoName);
        toast.success(`Signed in as ${demoName || demoEmail}!`);
        navigate("/");
      } else {
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setCountdown(30);
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
        toast.info(
          reqRes.data?.message || `Verification code sent to ${demoEmail}. Check your inbox.`
        );
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK" || !err.response
          ? "Cannot connect to backend server. Make sure the backend is running on port 5001."
          : "Quick demo login failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-12 items-center">
        {/* Left: Editorial Hero Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-borderWarm bg-cream-surface px-3.5 py-1 text-xs font-medium text-forest shadow-subtle">
            <Compass className="h-4 w-4 text-accentGold" />
            <span>KIET Institutional Recovery</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-tight text-ink">
            A safer, verified way to recover what’s lost.
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl">
            Reserved exclusively for students and staff of KIET Group of Institutions. Authenticated with verified institutional email OTP.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
              <Sparkles className="h-5 w-5 text-accentGold mb-2" />
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink">@kiet.edu</p>
              <p className="text-xs text-ink-muted mt-0.5">Verified domain</p>
            </div>

            <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
              <ShieldCheck className="h-5 w-5 text-forest mb-2" />
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink">Zero-Password</p>
              <p className="text-xs text-ink-muted mt-0.5">Single-use OTPs</p>
            </div>

            <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
              <HeartHandshake className="h-5 w-5 text-foundGreen mb-2" />
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink">Campus Only</p>
              <p className="text-xs text-ink-muted mt-0.5">Safe & trustworthy</p>
            </div>
          </div>

          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-borderWarm bg-cream-surface shadow-card hidden sm:block">
            <img
              src={CAMPUS_LOGIN_IMAGE}
              alt="KIET Campus"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
            <div className="absolute bottom-3 left-4 text-xs text-cream-surface font-medium">
              KIET Group of Institutions, Ghaziabad
            </div>
          </div>
        </div>

        {/* Right: Dynamic Step Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-borderWarm bg-cream-surface p-6 sm:p-8 shadow-card space-y-6">
            {step === "email" && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sage">
                    Step 1 of 2 · Sign In
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink">
                    Enter College Email
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    We'll email a 6-digit verification code to your official <strong>@kiet.edu</strong> address.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="harshitagrahari33@gmail.com or username@kiet.edu"
                      className="h-12 w-full rounded-xl border border-borderWarm bg-cream/50 px-4 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-sm font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-card disabled:opacity-50"
                  >
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                {/* Quick Access / Demo Accounts */}
                {(!import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') && (
                  <div className="pt-2 border-t border-borderWarm-light space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                      <KeyRound className="h-3 w-3 text-sage" />
                      <span>Quick Access / Testing:</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSendOtpToEmail("harshitagrahari33@gmail.com")}
                        className="rounded-xl border border-forest/40 bg-forest/5 p-2.5 text-left hover:border-forest hover:bg-forest/10 transition-colors disabled:opacity-50"
                      >
                        <span className="block text-xs font-semibold text-forest flex items-center gap-1">
                          <Mail className="h-3 w-3 text-forest" />
                          Send OTP to Gmail
                        </span>
                        <span className="block text-[10px] text-ink-muted truncate">harshitagrahari33@gmail.com</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleQuickLogin("harshit.21b0101@kiet.edu", "Harshit Agrahari")}
                        className="rounded-xl border border-borderWarm bg-cream/70 p-2.5 text-left hover:border-forest hover:bg-cream transition-colors disabled:opacity-50"
                      >
                        <span className="block text-xs font-semibold text-forest">Student Demo</span>
                        <span className="block text-[10px] text-ink-muted truncate">Harshit (21B0101)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleQuickLogin("admin@kiet.edu", "Campus Admin")}
                        className="rounded-xl border border-borderWarm bg-cream/70 p-2.5 text-left hover:border-forest hover:bg-cream transition-colors disabled:opacity-50"
                      >
                        <span className="block text-xs font-semibold text-forest flex items-center gap-1">
                          <Shield className="h-3 w-3 text-accentGold" />
                          Admin Demo
                        </span>
                        <span className="block text-[10px] text-ink-muted truncate">Full Moderator Access</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center pt-1">
                  <Link
                    to="/"
                    className="text-xs font-medium text-forest hover:underline"
                  >
                    Explore campus listings as Guest →
                  </Link>
                </div>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-sage">
                      Step 2 of 2 · Verification
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="text-xs text-forest hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink">
                    Enter 6-Digit Code
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Sent to <strong className="text-ink">{email}</strong>. Valid for 5 minutes.
                  </p>
                </div>

                {devOtpHint && (
                  <div className="flex items-center justify-between rounded-xl border border-accentGold/40 bg-accentGold/10 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-ink">
                      <Sparkles className="h-3.5 w-3.5 text-accentGold" />
                      <span>Code: <strong className="font-mono font-bold tracking-wider text-forest">{devOtpHint}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtpHint.split("").slice(0, 6);
                        setOtp(digits);
                        setTimeout(() => otpInputsRef.current[5]?.focus(), 50);
                      }}
                      className="rounded-lg bg-forest px-2.5 py-1 text-[11px] font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-sm"
                    >
                      Auto-fill Code
                    </button>
                  </div>
                )}

                <form onSubmit={handleOtpSubmit} className="space-y-5 pt-2">
                  <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-12 w-11 sm:w-12 text-center text-xl font-bold rounded-xl border border-borderWarm bg-cream/50 text-ink outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-2 focus:ring-forest/20"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || otp.join("").length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-sm font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-card disabled:opacity-50"
                  >
                    <span>Verify & Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-ink-muted">Didn't receive code?</span>
                    <button
                      type="button"
                      disabled={countdown > 0}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1 text-forest font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === "name" && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sage">
                    Welcome to KIET Lost & Found!
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink">
                    What's your full name?
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    This is your first time signing in. Enter your name to display on your campus reports.
                  </p>
                </div>

                <form onSubmit={handleNameSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
                      <input
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Harshit Agrahari"
                        className="h-12 w-full rounded-xl border border-borderWarm bg-cream/50 pl-10 pr-4 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-sm font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-card disabled:opacity-50"
                  >
                    <span>Complete Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}

            <div className="pt-4 border-t border-borderWarm-light text-center">
              <p className="text-[11px] text-ink-light">
                Institutional single-sign-on · End-to-end verified · KIET Community
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
