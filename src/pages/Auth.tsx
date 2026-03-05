import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
  Shield,
  User,
  Zap,
} from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

type RegistrationTrack = "club_admin" | "partner";
type RegistrationStep = 1 | 2 | 3;
type SignupPath = "fast_track" | "detailed";

interface ClubSetupForm {
  clubName: string;
  clubType: string;
  country: string;
  website: string;
  description: string;
  facilities: string[];
  achievements: string;
}

interface PartnerSetupForm {
  companyName: string;
  partnerType: string;
  country: string;
  website: string;
  services: string;
  notes: string;
}

interface AdminAccountForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  readyToProceed: boolean;
}

interface FastTrackForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const CLUB_TYPES = ["football", "academy", "multisport", "other"] as const;
const PARTNER_TYPES = ["supplier", "sponsor", "service_provider", "consultant"] as const;
const COUNTRIES = ["Germany", "Austria", "Switzerland", "Other"] as const;
const FACILITY_OPTIONS = [
  "indoor_courts",
  "outdoor_fields",
  "swimming_pool",
  "gym_equipment",
  "changing_rooms",
  "parking",
  "cafeteria",
  "meeting_rooms",
] as const;

const ACTIVE_ROLE_KEY = "one4team.activeRole";
const ACTIVE_CLUB_KEY_PREFIX = "one4team.activeClubId";

function hasUppercase(value: string) {
  return /[A-Z]/.test(value);
}

function hasLowercase(value: string) {
  return /[a-z]/.test(value);
}

function hasNumber(value: string) {
  return /\d/.test(value);
}

function hasSpecial(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function getPasswordChecks(value: string) {
  return {
    minLength: value.length >= 8,
    lowercase: hasLowercase(value),
    uppercase: hasUppercase(value),
    number: hasNumber(value),
    special: hasSpecial(value),
  };
}

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupPath, setSignupPath] = useState<SignupPath>("fast_track");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendingFromLogin, setResendingFromLogin] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [deliveryHint, setDeliveryHint] = useState("");
  const [step, setStep] = useState<RegistrationStep>(1);
  const [track, setTrack] = useState<RegistrationTrack>("club_admin");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showFastPassword, setShowFastPassword] = useState(false);
  const [showFastConfirmPassword, setShowFastConfirmPassword] = useState(false);

  const [clubForm, setClubForm] = useState<ClubSetupForm>({
    clubName: "",
    clubType: "",
    country: "",
    website: "",
    description: "",
    facilities: [],
    achievements: "",
  });

  const [partnerForm, setPartnerForm] = useState<PartnerSetupForm>({
    companyName: "",
    partnerType: "",
    country: "",
    website: "",
    services: "",
    notes: "",
  });

  const [accountForm, setAccountForm] = useState<AdminAccountForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
    readyToProceed: false,
  });

  const [fastTrackForm, setFastTrackForm] = useState<FastTrackForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const { user, signIn, signInWithMagicLink, signUp, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeoutId = window.setTimeout(() => setResendCooldown((previous) => previous - 1), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  useEffect(() => {
    if (mode !== "login" || !user) return;

    let isActive = true;
    const resolveDestination = async () => {
      const { data, error } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!isActive) return;

      if (error || !data?.length) {
        navigate("/onboarding", { replace: true });
        return;
      }

      const memberships = data as Array<{ club_id: string; role: string }>;
      const roles = memberships.map((membership) => membership.role);
      const preferredRole = localStorage.getItem(ACTIVE_ROLE_KEY);
      const nextRole = preferredRole && roles.includes(preferredRole) ? preferredRole : roles[0] || "player";
      localStorage.setItem(ACTIVE_ROLE_KEY, nextRole);

      const scopedClubKey = `${ACTIVE_CLUB_KEY_PREFIX}:${user.id}`;
      const globalClubKey = ACTIVE_CLUB_KEY_PREFIX;
      const preferredClub =
        localStorage.getItem(scopedClubKey) ??
        localStorage.getItem(globalClubKey);
      const hasPreferredClub = Boolean(preferredClub && memberships.some((membership) => membership.club_id === preferredClub));
      const nextClubId = hasPreferredClub ? preferredClub! : memberships[0].club_id;
      localStorage.setItem(scopedClubKey, nextClubId);
      localStorage.removeItem(globalClubKey);

      navigate(`/dashboard/${nextRole}`, { replace: true });
    };

    void resolveDestination();

    return () => {
      isActive = false;
    };
  }, [mode, navigate, user]);

  const detailedPasswordChecks = useMemo(() => getPasswordChecks(accountForm.password), [accountForm.password]);
  const detailedPasswordScore = useMemo(
    () => Object.values(detailedPasswordChecks).filter(Boolean).length,
    [detailedPasswordChecks]
  );
  const fastTrackPasswordChecks = useMemo(() => getPasswordChecks(fastTrackForm.password), [fastTrackForm.password]);
  const fastTrackPasswordScore = useMemo(
    () => Object.values(fastTrackPasswordChecks).filter(Boolean).length,
    [fastTrackPasswordChecks]
  );

  const passwordStrengthLabel = useMemo(() => {
    if (detailedPasswordScore <= 2) return t.onboarding.passwordWeak;
    if (detailedPasswordScore <= 4) return t.onboarding.passwordMedium;
    return t.onboarding.passwordStrong;
  }, [detailedPasswordScore, t]);

  const passwordsMatch = accountForm.password.length > 0 && accountForm.password === accountForm.confirmPassword;
  const fastTrackPasswordsMatch =
    fastTrackForm.password.length > 0 && fastTrackForm.password === fastTrackForm.confirmPassword;
  const canSubmitFastTrack = Boolean(
    fastTrackForm.fullName.trim() &&
      fastTrackForm.email.trim() &&
      fastTrackForm.password &&
      fastTrackPasswordsMatch &&
      fastTrackPasswordScore >= 4 &&
      fastTrackForm.acceptTerms &&
      fastTrackForm.acceptPrivacy
  );

  const canContinueStepOne = useMemo(() => {
    if (track === "club_admin")
      return Boolean(clubForm.clubName.trim() && clubForm.clubType && clubForm.country);
    return Boolean(partnerForm.companyName.trim() && partnerForm.partnerType && partnerForm.country);
  }, [track, clubForm, partnerForm]);

  const canContinueStepTwo = useMemo(() => {
    return Boolean(
      accountForm.firstName.trim() &&
        accountForm.lastName.trim() &&
        accountForm.email.trim() &&
        accountForm.password &&
        passwordsMatch &&
        detailedPasswordScore >= 4 &&
        accountForm.acceptTerms &&
        accountForm.acceptPrivacy
    );
  }, [accountForm, detailedPasswordScore, passwordsMatch]);

  const canSubmitStepThree = canContinueStepTwo && accountForm.readyToProceed;
  const authDiagnostics = useMemo(() => {
    const issues: string[] = [];
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    const origin = window.location.origin;

    if (!supabaseUrl || !supabaseKey)
      issues.push(t.auth.authDiagMissingEnv);

    if (supabaseUrl?.includes("placeholder") || supabaseUrl?.includes("example"))
      issues.push(t.auth.authDiagPlaceholderUrl);

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      issues.push(t.auth.authDiagLocalhostRedirect.split("{origin}").join(origin));

    issues.push(t.auth.authDiagEmailProvider);

    return issues;
  }, [t]);

  const resetSignupFlow = () => {
    setStep(1);
    setTrack("club_admin");
    setSignupPath("fast_track");
    setVerificationEmail("");
    setDeliveryHint("");
    setResendCooldown(0);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowFastPassword(false);
    setShowFastConfirmPassword(false);
    setClubForm({
      clubName: "",
      clubType: "",
      country: "",
      website: "",
      description: "",
      facilities: [],
      achievements: "",
    });
    setPartnerForm({
      companyName: "",
      partnerType: "",
      country: "",
      website: "",
      services: "",
      notes: "",
    });
    setAccountForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
      readyToProceed: false,
    });
    setFastTrackForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
    });
  };

  const updateClubField = (key: keyof ClubSetupForm, value: string | string[]) => {
    setClubForm((previous) => ({ ...previous, [key]: value }));
  };

  const updatePartnerField = (key: keyof PartnerSetupForm, value: string) => {
    setPartnerForm((previous) => ({ ...previous, [key]: value }));
  };

  const updateAccountField = (key: keyof AdminAccountForm, value: string | boolean) => {
    setAccountForm((previous) => ({ ...previous, [key]: value }));
  };

  const updateFastTrackField = (key: keyof FastTrackForm, value: string | boolean) => {
    setFastTrackForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleFacility = (facility: string) => {
    setClubForm((previous) => {
      const exists = previous.facilities.includes(facility);
      return {
        ...previous,
        facilities: exists
          ? previous.facilities.filter((item) => item !== facility)
          : [...previous.facilities, facility],
      };
    });
  };

  const buildRegistrationMetadata = () => {
    const common = {
      registration_track: track,
      registration_path: signupPath,
      registration_completed_at: new Date().toISOString(),
      preferred_language: language,
    };

    if (track === "club_admin") {
      return {
        ...common,
        onboarding_prefill_world: "club",
        onboarding_prefill_role: "admin",
        club_setup: clubForm,
      };
    }

    return {
      ...common,
      onboarding_prefill_world: "partner",
      onboarding_prefill_role: partnerForm.partnerType || "supplier",
      partner_setup: partnerForm,
    };
  };

  const saveRegistrationSummary = (registeredEmail: string) => {
    localStorage.setItem(
      "one4team.registrationSummary",
      JSON.stringify({
        registration_track: track,
        registration_path: signupPath,
        club_setup: clubForm,
        partner_setup: partnerForm,
        account: {
          first_name:
            signupPath === "detailed"
              ? accountForm.firstName
              : fastTrackForm.fullName.split(" ").slice(0, 1).join(" "),
          last_name:
            signupPath === "detailed"
              ? accountForm.lastName
              : fastTrackForm.fullName.split(" ").slice(1).join(" "),
          email: registeredEmail,
          phone: signupPath === "detailed" ? accountForm.phone : "",
        },
        created_at: new Date().toISOString(),
      })
    );
  };

  const handleSignupSuccess = (registeredEmail: string) => {
    saveRegistrationSummary(registeredEmail);
    setVerificationEmail(registeredEmail);
    setResendCooldown(30);
    toast({
      title: t.auth.checkEmail,
      description: t.auth.checkEmailDesc,
    });
  };

  const registerFastTrack = async () => {
    const trimmedEmail = fastTrackForm.email.trim();
    const metadata = {
      registration_track: track,
      registration_path: "fast_track",
      registration_completed_at: new Date().toISOString(),
      preferred_language: language,
      onboarding_prefill_world: track === "club_admin" ? "club" : "partner",
      onboarding_prefill_role: track === "club_admin" ? "admin" : "supplier",
      fast_track: true,
    };
    const { error, user, session } = await signUp(
      trimmedEmail,
      fastTrackForm.password,
      fastTrackForm.fullName.trim(),
      metadata
    );
    if (error) {
      toast({ title: t.auth.signupFailed, description: error.message, variant: "destructive" });
      if (error.message.toLowerCase().includes("already")) {
        setVerificationEmail(trimmedEmail);
      }
      return;
    }
    if (session || user?.email_confirmed_at)
      setDeliveryHint(t.auth.deliveryHintConfirmDisabled);
    handleSignupSuccess(trimmedEmail);
  };

  const registerDetailed = async () => {
    const metadata = buildRegistrationMetadata();
    const fullName = `${accountForm.firstName} ${accountForm.lastName}`.trim();
    const trimmedEmail = accountForm.email.trim();
    const { error, user, session } = await signUp(trimmedEmail, accountForm.password, fullName, metadata);
    if (error) {
      toast({ title: t.auth.signupFailed, description: error.message, variant: "destructive" });
      if (error.message.toLowerCase().includes("already")) {
        setVerificationEmail(trimmedEmail);
      }
      return;
    }
    if (session || user?.email_confirmed_at)
      setDeliveryHint(t.auth.deliveryHintConfirmDisabled);
    handleSignupSuccess(trimmedEmail);
  };

  const handleResendVerification = async () => {
    if (!verificationEmail || resendCooldown > 0) return;
    setResending(true);
    const { error } = await resendConfirmation(verificationEmail);
    if (error) {
      toast({ title: t.auth.signupFailed, description: error.message, variant: "destructive" });
    } else {
      setResendCooldown(30);
      toast({ title: t.auth.emailResent, description: t.auth.emailResentDesc });
    }
    setResending(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        const isInvalidCredentials = error.message.toLowerCase().includes("invalid login credentials");
        toast({
          title: t.auth.loginFailed,
          description: isInvalidCredentials ? t.auth.loginFailedUnconfirmedHint : error.message,
          variant: "destructive",
        });
      }
    } else {
      if (signupPath === "fast_track") {
        await registerFastTrack();
      } else {
        await registerDetailed();
      }
    }
    setLoading(false);
  };

  const handleResendFromLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: t.auth.emailRequiredForResend,
        description: t.auth.emailRequiredForResendDesc,
        variant: "destructive",
      });
      return;
    }

    if (resendCooldown > 0) return;

    setResendingFromLogin(true);
    const { error } = await resendConfirmation(trimmedEmail);
    if (error) {
      toast({ title: t.auth.signupFailed, description: error.message, variant: "destructive" });
    } else {
      setResendCooldown(30);
      toast({ title: t.auth.emailResent, description: t.auth.emailResentDesc });
    }
    setResendingFromLogin(false);
  };

  const handleMagicLinkFromLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: t.auth.emailRequiredForMagicLink,
        description: t.auth.emailRequiredForMagicLinkDesc,
        variant: "destructive",
      });
      return;
    }

    setMagicLinkSending(true);
    const { error } = await signInWithMagicLink(trimmedEmail);
    if (error) {
      toast({ title: t.auth.loginFailed, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.auth.magicLinkSent, description: t.auth.magicLinkSentDesc });
    }
    setMagicLinkSending(false);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AppHeader title="ONE4Team" subtitle={mode === "login" ? t.common.signIn : t.auth.createAccount} back={false} />

      <div className="fixed inset-0 pointer-events-none">
        <FootballFieldAnimation lang={language} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:from-background/80 dark:via-background/40 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 dark:from-background/60 dark:via-transparent dark:to-background/60" />
      </div>

      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 pb-10 sm:pb-[10vh]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`w-full relative ${mode === "signup" ? "max-w-3xl" : "max-w-md"}`}
        >
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="text-center mb-8 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="ONE4Team" className="w-16 h-16 mx-auto mb-4 drop-shadow-xl" />
            <h1 className="font-logo text-2xl tracking-tight">
              ONE <span className="text-gradient-gold-animated">4</span> Team
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {mode === "login" ? t.auth.welcomeBack : t.auth.createYourAccount}
            </p>
          </motion.div>

          <div className="ios-segment flex mb-6">
            {(["login", "signup"] as const).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setMode(value);
                  if (value === "signup") resetSignupFlow();
                }}
                className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-200 ${
                  mode === value ? "ios-segment-active text-foreground" : "text-muted-foreground"
                }`}
              >
                {value === "login" ? t.common.signIn : t.common.signUp}
              </button>
            ))}
          </div>

          <div className="rounded-2xl glass-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "login" && (
                <>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      {t.auth.email} *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="pl-9 glass-input rounded-xl text-[13px] h-11"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      {t.auth.password} *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <Input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="pl-9 pr-10 glass-input rounded-xl text-[13px] h-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 rounded-xl h-11 text-[13px] shadow-gold haptic-press"
                  >
                    {loading ? t.auth.pleaseWait : t.common.signIn}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMagicLinkFromLogin}
                    disabled={magicLinkSending}
                    className="w-full"
                  >
                    {magicLinkSending ? t.auth.pleaseWait : t.auth.sendMagicLink}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendFromLogin}
                    disabled={resendingFromLogin || resendCooldown > 0}
                    className="w-full text-xs text-muted-foreground"
                  >
                    {resendCooldown > 0
                      ? t.auth.resendInSeconds.replace("{seconds}", String(resendCooldown))
                      : t.auth.resendVerificationEmail}
                  </Button>
                </>
              )}

              {mode === "signup" && (
                <div className="space-y-5">
                  <div className="text-center mb-1">
                    <h2 className="font-display text-xl font-bold text-foreground">{t.onboarding.registrationTitle}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{t.onboarding.registrationSubtitle}</p>
                  </div>

                  {!verificationEmail && (
                    <div className="ios-segment flex">
                      <button
                        type="button"
                        onClick={() => setSignupPath("fast_track")}
                        className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-200 ${
                          signupPath === "fast_track" ? "ios-segment-active text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          {t.auth.fastTrack}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupPath("detailed")}
                        className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-200 ${
                          signupPath === "detailed" ? "ios-segment-active text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          {t.auth.detailedSetup}
                        </span>
                      </button>
                    </div>
                  )}

                  {verificationEmail && (
                    <div className="space-y-4">
                      {deliveryHint && (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
                          {deliveryHint}
                        </div>
                      )}
                      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-gold-static text-primary-foreground flex items-center justify-center mx-auto mb-3">
                          <MailCheck className="w-6 h-6" />
                        </div>
                        <div className="text-xl font-display font-bold text-primary mb-1">{t.auth.verifyEmailTitle}</div>
                        <div className="text-sm text-muted-foreground">{t.auth.verifyEmailDesc}</div>
                        <div className="mt-2 text-xs font-semibold text-foreground">{verificationEmail}</div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={resending || resendCooldown > 0}
                        className="w-full"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${resending ? "animate-spin" : ""}`} />
                        {resendCooldown > 0
                          ? t.auth.resendInSeconds.replace("{seconds}", String(resendCooldown))
                          : t.auth.resendVerificationEmail}
                      </Button>

                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                        <div className="font-semibold mb-1 inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t.auth.quickDiagnostics}
                        </div>
                        <ul className="space-y-1 list-disc pl-4">
                          {authDiagnostics.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setMode("login");
                            setVerificationEmail("");
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          {t.common.signIn}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setVerificationEmail("");
                            resetSignupFlow();
                          }}
                        >
                          {t.auth.startNewRegistration}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!verificationEmail && signupPath === "fast_track" && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                        {t.auth.fastTrackDesc}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTrack("club_admin")}
                          className={`text-left rounded-xl border p-4 transition-all ${
                            track === "club_admin"
                              ? "border-primary/60 bg-primary/10 shadow-gold"
                              : "border-border/60 bg-background/30"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">{t.onboarding.clubAdminOwner}</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTrack("partner")}
                          className={`text-left rounded-xl border p-4 transition-all ${
                            track === "partner"
                              ? "border-primary/60 bg-primary/10 shadow-gold"
                              : "border-border/60 bg-background/30"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center mb-2">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">{t.onboarding.supplierPartner}</div>
                        </button>
                      </div>

                      <label className="text-[11px] font-medium text-muted-foreground block">{t.auth.fullName} *</label>
                      <Input
                        value={fastTrackForm.fullName}
                        onChange={(event) => updateFastTrackField("fullName", event.target.value)}
                        placeholder={t.auth.yourName}
                      />

                      <label className="text-[11px] font-medium text-muted-foreground block">{t.auth.email} *</label>
                      <Input
                        type="email"
                        value={fastTrackForm.email}
                        onChange={(event) => updateFastTrackField("email", event.target.value)}
                        placeholder="you@example.com"
                      />

                      <label className="text-[11px] font-medium text-muted-foreground block">{t.auth.password} *</label>
                      <div className="relative">
                        <Input
                          type={showFastPassword ? "text" : "password"}
                          value={fastTrackForm.password}
                          onChange={(event) => updateFastTrackField("password", event.target.value)}
                          placeholder={t.onboarding.passwordPlaceholder}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFastPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showFastPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <label className="text-[11px] font-medium text-muted-foreground block">
                        {t.onboarding.confirmPasswordPlaceholder} *
                      </label>
                      <div className="relative">
                        <Input
                          type={showFastConfirmPassword ? "text" : "password"}
                          value={fastTrackForm.confirmPassword}
                          onChange={(event) => updateFastTrackField("confirmPassword", event.target.value)}
                          placeholder={t.onboarding.confirmPasswordPlaceholder}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFastConfirmPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showFastConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="grid gap-1 text-[11px] rounded-xl border border-border/60 bg-background/30 p-3">
                        <div className={fastTrackPasswordChecks.minLength ? "text-emerald-400" : "text-muted-foreground"}>
                          {fastTrackPasswordChecks.minLength ? "✓" : "•"} {t.onboarding.passwordRuleMinLength}
                        </div>
                        <div className={fastTrackPasswordChecks.lowercase ? "text-emerald-400" : "text-muted-foreground"}>
                          {fastTrackPasswordChecks.lowercase ? "✓" : "•"} {t.onboarding.passwordRuleLowercase}
                        </div>
                        <div className={fastTrackPasswordChecks.uppercase ? "text-emerald-400" : "text-muted-foreground"}>
                          {fastTrackPasswordChecks.uppercase ? "✓" : "•"} {t.onboarding.passwordRuleUppercase}
                        </div>
                        <div className={fastTrackPasswordChecks.number ? "text-emerald-400" : "text-muted-foreground"}>
                          {fastTrackPasswordChecks.number ? "✓" : "•"} {t.onboarding.passwordRuleNumber}
                        </div>
                        <div className={fastTrackPasswordChecks.special ? "text-emerald-400" : "text-muted-foreground"}>
                          {fastTrackPasswordChecks.special ? "✓" : "•"} {t.onboarding.passwordRuleSpecial}
                        </div>
                        {fastTrackPasswordsMatch && <div className="text-emerald-400">✓ {t.onboarding.passwordsMatch}</div>}
                      </div>

                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={fastTrackForm.acceptTerms}
                          onChange={(event) => updateFastTrackField("acceptTerms", event.target.checked)}
                          className="accent-primary"
                        />
                        <span>
                          {t.onboarding.acceptTerms}{" "}
                          <a className="text-primary" href="/terms" target="_blank" rel="noreferrer">
                            {t.footer.termsOfService}
                          </a>{" "}
                          *
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={fastTrackForm.acceptPrivacy}
                          onChange={(event) => updateFastTrackField("acceptPrivacy", event.target.checked)}
                          className="accent-primary"
                        />
                        <span>
                          {t.onboarding.acceptPrivacy}{" "}
                          <a className="text-primary" href="/privacy" target="_blank" rel="noreferrer">
                            {t.footer.privacyPolicy}
                          </a>{" "}
                          *
                        </span>
                      </label>

                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => {
                            setMode("login");
                            resetSignupFlow();
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          {t.common.signIn}
                        </Button>

                        <Button
                          type="submit"
                          disabled={loading || !canSubmitFastTrack}
                          className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                        >
                          {loading ? t.auth.pleaseWait : t.auth.createAccount}
                          <Mail className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {!verificationEmail && signupPath === "detailed" && (
                    <>
                      <div className="grid grid-cols-[auto,1fr,auto,1fr,auto,1fr,auto] items-center w-full">
                        {[1, 2, 3, 4].map((value) => {
                          const isComplete = step > value;
                          const isActive = step === value;
                          const isBrandStep = value === 4;
                          return (
                            <div key={value} className="contents">
                              <div
                                className={
                                  isBrandStep
                                    ? "w-[1.4rem] h-[1.4rem] flex items-center justify-center justify-self-center"
                                    : `w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border ${
                                        isComplete || isActive
                                          ? "bg-gradient-gold-static text-primary-foreground border-primary/60"
                                          : "bg-background/40 text-muted-foreground border-border/60"
                                      } justify-self-center`
                                }
                              >
                                {isBrandStep ? (
                                  <img src={logo} alt="" className="w-[1.4rem] h-[1.4rem] object-contain" />
                                ) : isComplete ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  value
                                )}
                              </div>
                              {value < 4 && (
                                <div className={`h-[2px] w-full ${step > value ? "bg-primary" : "bg-border/70"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {step === 1 && (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                            {t.onboarding.professionalInfoNotice}
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setTrack("club_admin")}
                              className={`text-left rounded-xl border p-4 transition-all ${
                                track === "club_admin"
                                  ? "border-primary/60 bg-primary/10 shadow-gold"
                                  : "border-border/60 bg-background/30"
                              }`}
                            >
                              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="text-sm font-semibold text-foreground">{t.onboarding.clubAdminOwner}</div>
                              <div className="text-[11px] text-muted-foreground mt-1">{t.onboarding.clubAdminOwnerDesc}</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTrack("partner")}
                              className={`text-left rounded-xl border p-4 transition-all ${
                                track === "partner"
                                  ? "border-primary/60 bg-primary/10 shadow-gold"
                                  : "border-border/60 bg-background/30"
                              }`}
                            >
                              <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center mb-2">
                                <Briefcase className="w-4 h-4" />
                              </div>
                              <div className="text-sm font-semibold text-foreground">{t.onboarding.supplierPartner}</div>
                              <div className="text-[11px] text-muted-foreground mt-1">{t.onboarding.supplierPartnerDesc}</div>
                            </button>
                          </div>

                          {track === "club_admin" ? (
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-foreground">{t.onboarding.clubInformation}</div>
                              <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.clubName}</label>
                              <Input
                                value={clubForm.clubName}
                                onChange={(event) => updateClubField("clubName", event.target.value)}
                                placeholder={t.onboarding.clubNamePlaceholder}
                              />
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.clubType} *</label>
                                  <Select
                                    value={clubForm.clubType || undefined}
                                    onValueChange={(value) => updateClubField("clubType", value)}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/50 text-sm">
                                      <SelectValue placeholder={t.onboarding.selectClubType} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                                      {CLUB_TYPES.map((clubType) => (
                                        <SelectItem key={clubType} value={clubType} className="rounded-lg">
                                          {t.onboarding.clubTypeOptions[clubType]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.country} *</label>
                                  <Select
                                    value={clubForm.country || undefined}
                                    onValueChange={(value) => updateClubField("country", value)}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/50 text-sm">
                                      <SelectValue placeholder={t.onboarding.selectCountry} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                                      {COUNTRIES.map((country) => (
                                        <SelectItem key={country} value={country} className="rounded-lg">
                                          {country}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <label className="text-[11px] font-medium text-muted-foreground block">
                                {t.clubPageAdmin.website} ({t.onboarding.optional})
                              </label>
                              <Input
                                value={clubForm.website}
                                onChange={(event) => updateClubField("website", event.target.value)}
                                placeholder="https://yourclub.com"
                              />
                              <label className="text-[11px] font-medium text-muted-foreground block">
                                {t.clubPageAdmin.description} ({t.onboarding.optional})
                              </label>
                              <textarea
                                value={clubForm.description}
                                onChange={(event) => updateClubField("description", event.target.value)}
                                placeholder={t.onboarding.clubDescriptionPlaceholder}
                                className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                rows={3}
                                maxLength={500}
                              />
                              <div className="text-xs font-medium text-foreground">{t.onboarding.availableFacilities}</div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {FACILITY_OPTIONS.map((facility) => {
                                  const isChecked = clubForm.facilities.includes(facility);
                                  return (
                                    <button
                                      key={facility}
                                      type="button"
                                      onClick={() => toggleFacility(facility)}
                                      className={`text-left rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${
                                        isChecked
                                          ? "border-primary/50 bg-primary/10 text-primary"
                                          : "border-border/60 bg-background/40 text-muted-foreground"
                                      }`}
                                    >
                                      {t.onboarding.facilityOptions[facility]}
                                    </button>
                                  );
                                })}
                              </div>
                              <textarea
                                value={clubForm.achievements}
                                onChange={(event) => updateClubField("achievements", event.target.value)}
                                placeholder={t.onboarding.achievementsPlaceholder}
                                className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                rows={2}
                                maxLength={300}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-foreground">{t.onboarding.partnerInformation}</div>
                              <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.companyName} *</label>
                              <Input
                                value={partnerForm.companyName}
                                onChange={(event) => updatePartnerField("companyName", event.target.value)}
                                placeholder={t.onboarding.companyNamePlaceholder}
                              />
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.partnerType} *</label>
                                  <Select
                                    value={partnerForm.partnerType || undefined}
                                    onValueChange={(value) => updatePartnerField("partnerType", value)}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/50 text-sm">
                                      <SelectValue placeholder={t.onboarding.selectPartnerType} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                                      {PARTNER_TYPES.map((partnerType) => (
                                        <SelectItem key={partnerType} value={partnerType} className="rounded-lg">
                                          {t.onboarding.partnerTypeOptions[partnerType]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.country} *</label>
                                  <Select
                                    value={partnerForm.country || undefined}
                                    onValueChange={(value) => updatePartnerField("country", value)}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/50 text-sm">
                                      <SelectValue placeholder={t.onboarding.selectCountry} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                                      {COUNTRIES.map((country) => (
                                        <SelectItem key={country} value={country} className="rounded-lg">
                                          {country}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <label className="text-[11px] font-medium text-muted-foreground block">
                                {t.clubPageAdmin.website} ({t.onboarding.optional})
                              </label>
                              <Input
                                value={partnerForm.website}
                                onChange={(event) => updatePartnerField("website", event.target.value)}
                                placeholder="https://yourcompany.com"
                              />
                              <textarea
                                value={partnerForm.services}
                                onChange={(event) => updatePartnerField("services", event.target.value)}
                                placeholder={t.onboarding.partnerServicesPlaceholder}
                                className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                rows={2}
                                maxLength={250}
                              />
                              <textarea
                                value={partnerForm.notes}
                                onChange={(event) => updatePartnerField("notes", event.target.value)}
                                placeholder={t.onboarding.partnerNotesPlaceholder}
                                className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                rows={2}
                                maxLength={250}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-foreground">{t.onboarding.adminAccount}</div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.firstNamePlaceholder} *</label>
                              <Input
                                value={accountForm.firstName}
                                onChange={(event) => updateAccountField("firstName", event.target.value)}
                                placeholder={t.onboarding.firstNamePlaceholder}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground block">{t.onboarding.lastNamePlaceholder} *</label>
                              <Input
                                value={accountForm.lastName}
                                onChange={(event) => updateAccountField("lastName", event.target.value)}
                                placeholder={t.onboarding.lastNamePlaceholder}
                              />
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground block">{t.auth.email} *</label>
                              <Input
                                type="email"
                                value={accountForm.email}
                                onChange={(event) => updateAccountField("email", event.target.value)}
                                placeholder="admin@yourclub.com"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground block">
                                {t.settingsPage.phone} ({t.onboarding.optional})
                              </label>
                              <Input
                                value={accountForm.phone}
                                onChange={(event) => updateAccountField("phone", event.target.value)}
                                placeholder="+49 ..."
                              />
                            </div>
                          </div>
                          <label className="text-[11px] font-medium text-muted-foreground block">{t.auth.password} *</label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={accountForm.password}
                              onChange={(event) => updateAccountField("password", event.target.value)}
                              placeholder={t.onboarding.passwordPlaceholder}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <label className="text-[11px] font-medium text-muted-foreground block">
                            {t.onboarding.confirmPasswordPlaceholder} *
                          </label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={accountForm.confirmPassword}
                              onChange={(event) => updateAccountField("confirmPassword", event.target.value)}
                              placeholder={t.onboarding.confirmPasswordPlaceholder}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((value) => !value)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                            <div className="flex items-center justify-between text-[11px] mb-2">
                              <span className="text-muted-foreground">{t.onboarding.passwordStrength}</span>
                              <span className="text-primary font-semibold">{passwordStrengthLabel}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                              <div
                                className="h-full bg-gradient-gold-static transition-all"
                                style={{ width: `${(detailedPasswordScore / 5) * 100}%` }}
                              />
                            </div>
                            <div className="grid gap-1 text-[11px]">
                              <div className={detailedPasswordChecks.minLength ? "text-emerald-400" : "text-muted-foreground"}>
                                {detailedPasswordChecks.minLength ? "✓" : "•"} {t.onboarding.passwordRuleMinLength}
                              </div>
                              <div className={detailedPasswordChecks.lowercase ? "text-emerald-400" : "text-muted-foreground"}>
                                {detailedPasswordChecks.lowercase ? "✓" : "•"} {t.onboarding.passwordRuleLowercase}
                              </div>
                              <div className={detailedPasswordChecks.uppercase ? "text-emerald-400" : "text-muted-foreground"}>
                                {detailedPasswordChecks.uppercase ? "✓" : "•"} {t.onboarding.passwordRuleUppercase}
                              </div>
                              <div className={detailedPasswordChecks.number ? "text-emerald-400" : "text-muted-foreground"}>
                                {detailedPasswordChecks.number ? "✓" : "•"} {t.onboarding.passwordRuleNumber}
                              </div>
                              <div className={detailedPasswordChecks.special ? "text-emerald-400" : "text-muted-foreground"}>
                                {detailedPasswordChecks.special ? "✓" : "•"} {t.onboarding.passwordRuleSpecial}
                              </div>
                              {passwordsMatch && <div className="text-emerald-400">✓ {t.onboarding.passwordsMatch}</div>}
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={accountForm.acceptTerms}
                              onChange={(event) => updateAccountField("acceptTerms", event.target.checked)}
                              className="accent-primary"
                            />
                            <span>
                              {t.onboarding.acceptTerms}{" "}
                              <a className="text-primary" href="/terms" target="_blank" rel="noreferrer">
                                {t.footer.termsOfService}
                              </a>{" "}
                              *
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={accountForm.acceptPrivacy}
                              onChange={(event) => updateAccountField("acceptPrivacy", event.target.checked)}
                              className="accent-primary"
                            />
                            <span>
                              {t.onboarding.acceptPrivacy}{" "}
                              <a className="text-primary" href="/privacy" target="_blank" rel="noreferrer">
                                {t.footer.privacyPolicy}
                              </a>{" "}
                              *
                            </span>
                          </label>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                            <div className="text-sm font-semibold text-foreground mb-2">{t.onboarding.confirmDetails}</div>
                            <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                              {track === "club_admin" ? (
                                <>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.clubName}:</span> {clubForm.clubName}
                                  </div>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.clubType}:</span>{" "}
                                    {clubForm.clubType
                                      ? t.onboarding.clubTypeOptions[
                                          clubForm.clubType as keyof typeof t.onboarding.clubTypeOptions
                                        ]
                                      : "—"}
                                  </div>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.country}:</span> {clubForm.country || "—"}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.companyName}:</span> {partnerForm.companyName}
                                  </div>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.partnerType}:</span>{" "}
                                    {partnerForm.partnerType
                                      ? t.onboarding.partnerTypeOptions[
                                          partnerForm.partnerType as keyof typeof t.onboarding.partnerTypeOptions
                                        ]
                                      : "—"}
                                  </div>
                                  <div>
                                    <span className="text-foreground">{t.onboarding.country}:</span> {partnerForm.country || "—"}
                                  </div>
                                </>
                              )}
                              <div>
                                <span className="text-foreground">{t.auth.fullName}:</span> {accountForm.firstName} {accountForm.lastName}
                              </div>
                              <div>
                                <span className="text-foreground">{t.auth.email}:</span> {accountForm.email}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-gradient-gold-static text-primary-foreground flex items-center justify-center mx-auto mb-3">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="text-xl font-display font-bold text-primary mb-2">{t.onboarding.readyCreateAccount}</div>
                            <div className="text-sm text-muted-foreground">{t.onboarding.readyCreateAccountDesc}</div>
                            <div className="text-xs text-muted-foreground mt-2">{t.onboarding.professionalInfoNotice}</div>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={accountForm.readyToProceed}
                              onChange={(event) => updateAccountField("readyToProceed", event.target.checked)}
                              className="accent-primary"
                            />
                            {t.onboarding.readyToProceed} *
                          </label>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => {
                            if (step === 1) {
                              setMode("login");
                              resetSignupFlow();
                              return;
                            }
                            setStep((previous) => Math.max(1, previous - 1) as RegistrationStep);
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          {step === 1 ? t.common.signIn : t.common.back}
                        </Button>

                        {step < 3 ? (
                          <Button
                            type="button"
                            className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                            disabled={step === 1 ? !canContinueStepOne : !canContinueStepTwo}
                            onClick={() => setStep((previous) => Math.min(3, previous + 1) as RegistrationStep)}
                          >
                            {t.onboarding.nextStep}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            disabled={loading || !canSubmitStepThree}
                            className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                          >
                            {loading ? t.auth.pleaseWait : t.auth.createAccount}
                            <Shield className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  const nextMode = mode === "login" ? "signup" : "login";
                  setMode(nextMode);
                  if (nextMode === "signup") resetSignupFlow();
                }}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === "login" ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}
                <span className="text-primary font-medium">
                  {mode === "login" ? t.common.signUp : t.common.signIn}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-5 mx-auto flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium text-muted-foreground bg-background/60 backdrop-blur-xl border border-border/60 hover:bg-background/80 hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.common.back}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
