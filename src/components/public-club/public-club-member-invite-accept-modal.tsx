import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicClub } from "@/contexts/public-club-context";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { redeemClubInviteToken, storeActiveClubMembership } from "@/lib/club-invite-accept";
import { completeClubInviteSignup } from "@/lib/complete-club-invite-signup";
import {
  type ClubInvitePreview,
  type ClubInvitePreviewErrorCode,
  fetchClubInvitePreview,
  invitePreviewDisplayName,
  memberInviteModalDismissedStorageKey,
} from "@/lib/club-invite-preview";
import { getRedeemInviteErrorMessage } from "@/lib/redeem-invite-errors";
import { formatDashboardRoleLabel } from "@/lib/rbac-config";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";
import {
  clubModalFormInputClass,
  clubModalFormLabelClass,
  clubReadableModalOverlayClass,
  clubReadableModalPanelClass,
} from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

type ModalStep = "loading" | "error" | "review" | "confirm-email" | "success";

function getPasswordChecks(value: string) {
  return {
    minLength: value.length >= 8,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
}

function isPasswordValid(value: string): boolean {
  return Object.values(getPasswordChecks(value)).every(Boolean);
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900">{value}</p>
    </div>
  );
}

function ModalPasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={clubModalFormLabelClass}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(clubModalFormInputClass, "pr-11")}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-neutral-800"
          aria-label={visible ? t.clubPage.memberInviteModalHidePassword : t.clubPage.memberInviteModalShowPassword}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Auto-opens on public club pages when `?invite=` is present; pre-fills admin data and completes sign-up + redeem. */
export function PublicClubMemberInviteAcceptModal() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { club } = usePublicClub();
  const { user, signIn, signOut } = useAuth();

  const inviteToken = searchParams.get("invite")?.trim() ?? "";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("loading");
  const [preview, setPreview] = useState<ClubInvitePreview | null>(null);
  const [errorCode, setErrorCode] = useState<ClubInvitePreviewErrorCode | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInPassword, setSignInPassword] = useState("");
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const dismissKey = useMemo(
    () => (inviteToken.length >= 10 ? memberInviteModalDismissedStorageKey(inviteToken) : null),
    [inviteToken],
  );

  const inviteEmail = preview?.email ?? null;
  const userEmail = user?.email?.trim().toLowerCase() ?? "";
  const emailMatchesInvite = Boolean(
    inviteEmail && userEmail && inviteEmail === userEmail,
  );
  const emailMismatch = Boolean(user && inviteEmail && userEmail && inviteEmail !== userEmail);

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const finishRedeem = useCallback(
    async (token: string, userIdOverride?: string | null) => {
      const result = await redeemClubInviteToken(token);
      const userId = userIdOverride ?? user?.id;
      if (userId && result.clubId) {
        storeActiveClubMembership(userId, result.clubId, result.role);
      }
      setSuccessRole(result.role);
      setStep("success");
    },
    [user?.id],
  );

  const clubPagePath = preview?.clubSlug ? `/club/${encodeURIComponent(preview.clubSlug)}` : club ? `/club/${encodeURIComponent(club.slug)}` : null;
  const dashboardPath = successRole ? `/dashboard/${encodeURIComponent(successRole)}` : "/dashboard/player";

  const handleGoToClubPage = () => {
    if (!clubPagePath) return;
    handleDismiss();
    navigate(clubPagePath, { replace: true });
  };

  const handleGoToDashboard = () => {
    handleDismiss();
    navigate(dashboardPath, { replace: true });
  };

  const loadPreview = useCallback(async () => {
    if (!club || inviteToken.length < 10) return;

    setStep("loading");
    setErrorCode(null);

    const result = await fetchClubInvitePreview({
      inviteToken,
      clubSlug: club.slug,
    });

    if (!result.ok) {
      setPreview(null);
      setErrorCode(result.errorCode);
      setStep("error");
      setOpen(true);
      return;
    }

    setPreview(result.preview);
    setStep("review");
    const dismissed = dismissKey ? sessionStorage.getItem(dismissKey) === "1" : false;
    setOpen(!dismissed);
  }, [club, dismissKey, inviteToken]);

  useEffect(() => {
    if (!club || inviteToken.length < 10) {
      setOpen(false);
      setPreview(null);
      return;
    }
    void loadPreview();
  }, [club, inviteToken, loadPreview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && step !== "success") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, step]);

  const handleDismiss = () => {
    if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    setOpen(false);
  };

  const handleReopen = () => {
    if (dismissKey) sessionStorage.removeItem(dismissKey);
    setOpen(true);
  };

  const handleCreateAccountAndJoin = async () => {
    if (!preview || !inviteEmail || !passwordValid || !passwordsMatch) return;

    setSubmitting(true);
    try {
      const displayName = invitePreviewDisplayName(preview);
      const setupResult = await completeClubInviteSignup({
        inviteToken,
        clubSlug: preview.clubSlug,
        password,
        displayName,
        language: language === "de" ? "de" : "en",
      });

      if (!setupResult.ok) {
        if (setupResult.code === "already_registered") {
          setShowSignIn(true);
          toast({
            title: t.clubPage.memberInviteModalSignInInstead,
            description: t.clubPage.memberInviteModalSignInHint,
          });
          return;
        }
        throw new Error(setupResult.error);
      }

      const { error: signInError } = await signIn(inviteEmail, password);
      if (signInError) {
        setStep("confirm-email");
        toast({
          title: t.common.error,
          description: t.clubPage.memberInviteModalSignInAfterSetupFailed,
          variant: "destructive",
        });
        return;
      }

      if (setupResult.welcomeEmailSent) {
        toast({
          title: t.clubPage.memberInviteModalWelcomeEmailTitle,
          description: t.clubPage.memberInviteModalWelcomeEmailDesc.replace("{email}", inviteEmail),
        });
      }

      await finishRedeem(inviteToken);
    } catch (err: unknown) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : t.clubPage.memberInviteModalUnknownError,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignInAndJoin = async () => {
    if (!inviteEmail || !signInPassword.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await signIn(inviteEmail, signInPassword);
      if (error) throw error;
      await finishRedeem(inviteToken);
    } catch (err: unknown) {
      const description = getRedeemInviteErrorMessage(err, {
        unknown: t.onboarding.inviteRedeemUnknown,
        notAuthenticated: t.onboarding.inviteRedeemNotAuthenticated,
        invalidToken: t.onboarding.inviteRedeemInvalidToken,
        notFound: t.onboarding.inviteRedeemNotFound,
        alreadyUsed: t.onboarding.inviteRedeemAlreadyUsed,
        expired: t.onboarding.inviteRedeemExpired,
        emailMismatch: t.onboarding.inviteRedeemEmailMismatch,
        serverMisconfigured: t.onboarding.inviteRedeemServerMisconfigured,
      });
      toast({
        title: t.auth.loginFailed,
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAsSignedInUser = async () => {
    if (!emailMatchesInvite) return;
    setSubmitting(true);
    try {
      await finishRedeem(inviteToken);
    } catch (err: unknown) {
      const description = getRedeemInviteErrorMessage(err, {
        unknown: t.onboarding.inviteRedeemUnknown,
        notAuthenticated: t.onboarding.inviteRedeemNotAuthenticated,
        invalidToken: t.onboarding.inviteRedeemInvalidToken,
        notFound: t.onboarding.inviteRedeemNotFound,
        alreadyUsed: t.onboarding.inviteRedeemAlreadyUsed,
        expired: t.onboarding.inviteRedeemExpired,
        emailMismatch: t.onboarding.inviteRedeemEmailMismatch,
        serverMisconfigured: t.onboarding.inviteRedeemServerMisconfigured,
      });
      toast({
        title: t.onboarding.inviteFailed,
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!club || inviteToken.length < 10) return null;

  const errorMessage = (() => {
    switch (errorCode) {
      case "invalid_token":
      case "not_found":
      case "club_mismatch":
        return t.clubPage.memberInviteModalInvalidNotFound;
      case "already_used":
        return t.clubPage.memberInviteModalInvalidUsed;
      case "expired":
        return t.clubPage.memberInviteModalInvalidExpired;
      default:
        return t.clubPage.memberInviteModalUnknownError;
    }
  })();

  const roleLabel = formatDashboardRoleLabel(preview?.role ?? "member");
  const passwordChecks = getPasswordChecks(password);

  return (
    <>
      {!open && preview && step === "review" ? (
        <div className="border-b border-[color:var(--club-primary)]/20 bg-[color:var(--club-primary)]/8 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--club-muted)]">{t.clubPage.memberInviteBannerDesc}</p>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
              onClick={handleReopen}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              {t.clubPage.memberInviteModalOpenInvitation}
            </Button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <div
            className={cn(
              "fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4",
              clubReadableModalOverlayClass,
            )}
            onClick={() => {
              if (!submitting && step !== "success") handleDismiss();
            }}
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="club-member-invite-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={cn("w-full max-w-lg overflow-hidden", clubReadableModalPanelClass)}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-neutral-200/80 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-[color:var(--club-primary)]">
                      {step === "success" ? (
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                      ) : step === "error" ? (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="club-member-invite-title"
                        className="font-display text-base font-semibold text-neutral-900 sm:text-lg"
                      >
                        {step === "error"
                          ? t.clubPage.memberInviteModalInvalidTitle
                          : step === "success"
                            ? t.clubPage.memberInviteJoinSuccessTitle
                            : t.clubPage.memberInviteModalTitle.replace("{clubName}", preview?.clubName ?? club.name)}
                      </h2>
                      {step === "review" ? (
                        <p className="mt-0.5 text-xs text-neutral-600 sm:text-sm">
                          {t.clubPage.memberInviteModalReviewDesc}
                        </p>
                      ) : step === "success" ? (
                        <p className="mt-0.5 text-xs text-neutral-600 sm:text-sm">
                          {t.clubPage.memberInviteJoinSuccessHeadline.replace(
                            "{clubName}",
                            preview?.clubName ?? club.name,
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {step !== "success" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      onClick={handleDismiss}
                      disabled={submitting}
                      aria-label={t.common.close}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-5 sm:px-6">
                {step === "loading" ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.clubPage.memberInviteModalLoading}
                  </div>
                ) : null}

                {step === "error" ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-neutral-700">{errorMessage}</p>
                    <Button type="button" variant="outline" className="w-full" onClick={handleDismiss}>
                      {t.common.close}
                    </Button>
                  </div>
                ) : null}

                {step === "confirm-email" && preview ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-[color:var(--club-primary)]">
                      <Mail className="h-6 w-6" />
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-700">
                      {t.clubPage.memberInviteModalCheckEmailDesc.replace("{email}", inviteEmail ?? "")}
                    </p>
                    <p className="text-xs text-neutral-500">{t.clubPage.memberInviteModalCheckEmailReturn}</p>
                    <Button type="button" variant="outline" className="w-full" onClick={handleDismiss}>
                      {t.common.close}
                    </Button>
                  </div>
                ) : null}

                {step === "success" ? (
                  <div className="space-y-5 py-2 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed text-neutral-700">
                        {t.clubPage.memberInviteJoinSuccessDesc.replace(
                          "{clubName}",
                          preview?.clubName ?? club.name,
                        )}
                      </p>
                      {successRole ? (
                        <p className="text-xs font-medium text-neutral-500">
                          {t.clubPage.memberInviteModalRole}: {formatDashboardRoleLabel(successRole)}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-2 pt-1 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-neutral-300 bg-white font-semibold text-neutral-900"
                        onClick={handleGoToClubPage}
                        disabled={!clubPagePath}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t.clubPage.memberInviteJoinSuccessClubPageCta}
                      </Button>
                      <Button
                        type="button"
                        className={`w-full font-semibold ${clubCtaFillHoverClass}`}
                        style={clubCtaPrimaryInlineStyle(club.primary_color)}
                        onClick={handleGoToDashboard}
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t.clubPage.memberInviteJoinSuccessDashboardCta}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {step === "review" && preview ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReadOnlyField label={t.clubPage.memberInviteModalFirstName} value={preview.firstName} />
                      <ReadOnlyField label={t.clubPage.memberInviteModalLastName} value={preview.lastName} />
                    </div>
                    <ReadOnlyField label={t.clubPage.memberInviteModalEmail} value={preview.email} />
                    <ReadOnlyField label={t.clubPage.memberInviteModalRole} value={roleLabel} />
                    <ReadOnlyField label={t.clubPage.memberInviteModalTeam} value={preview.team} />
                    <ReadOnlyField label={t.clubPage.memberInviteModalAgeGroup} value={preview.ageGroup} />
                    <ReadOnlyField label={t.clubPage.memberInviteModalPosition} value={preview.position} />

                    <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                      {t.clubPage.memberInviteModalContactAdmin}
                    </p>

                    {emailMismatch ? (
                      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950">
                        <p>
                          {t.clubPage.memberInviteModalEmailMismatch
                            .replace("{currentEmail}", userEmail)
                            .replace("{inviteEmail}", inviteEmail ?? "")}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-red-300 bg-white"
                          onClick={() => void signOut()}
                        >
                          {t.clubPage.memberInviteModalSignOutCta}
                        </Button>
                      </div>
                    ) : null}

                    {user && emailMatchesInvite ? (
                      <Button
                        type="button"
                        className={`w-full font-semibold ${clubCtaFillHoverClass}`}
                        style={clubCtaPrimaryInlineStyle(club.primary_color)}
                        disabled={submitting}
                        onClick={() => void handleAcceptAsSignedInUser()}
                      >
                        {submitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {t.clubPage.memberInviteModalAcceptCta}
                      </Button>
                    ) : null}

                    {!user && !showSignIn ? (
                      <form
                        className="space-y-4 border-t border-neutral-200/80 pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (submitting || !passwordValid || !passwordsMatch) return;
                          void handleCreateAccountAndJoin();
                        }}
                      >
                        <ModalPasswordField
                          id="club-invite-password"
                          label={t.clubPage.memberInviteModalSetPassword}
                          value={password}
                          onChange={setPassword}
                          autoComplete="new-password"
                        />
                        <ModalPasswordField
                          id="club-invite-confirm-password"
                          label={t.clubPage.memberInviteModalConfirmPassword}
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          autoComplete="new-password"
                        />
                        <ul className="grid gap-1 text-xs text-neutral-600 sm:grid-cols-2">
                          <li className={passwordChecks.minLength ? "text-emerald-700" : undefined}>
                            {t.onboarding.passwordRuleMinLength}
                          </li>
                          <li className={passwordChecks.lowercase ? "text-emerald-700" : undefined}>
                            {t.onboarding.passwordRuleLowercase}
                          </li>
                          <li className={passwordChecks.uppercase ? "text-emerald-700" : undefined}>
                            {t.onboarding.passwordRuleUppercase}
                          </li>
                          <li className={passwordChecks.number ? "text-emerald-700" : undefined}>
                            {t.onboarding.passwordRuleNumber}
                          </li>
                          <li className={passwordChecks.special ? "text-emerald-700" : undefined}>
                            {t.onboarding.passwordRuleSpecial}
                          </li>
                        </ul>
                        <Button
                          type="submit"
                          className={`w-full font-semibold ${clubCtaFillHoverClass}`}
                          style={clubCtaPrimaryInlineStyle(club.primary_color)}
                          disabled={submitting || !passwordValid || !passwordsMatch}
                        >
                          {submitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          {t.clubPage.memberInviteModalCreateAccountCta}
                        </Button>
                        <button
                          type="button"
                          className="w-full text-center text-xs font-medium text-[color:var(--club-primary)] underline-offset-2 hover:underline"
                          onClick={() => setShowSignIn(true)}
                        >
                          {t.clubPage.memberInviteModalSignInInstead}
                        </button>
                      </form>
                    ) : null}

                    {!user && showSignIn ? (
                      <form
                        className="space-y-4 border-t border-neutral-200/80 pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (submitting || !signInPassword.trim()) return;
                          void handleSignInAndJoin();
                        }}
                      >
                        <ReadOnlyField label={t.clubPage.memberInviteModalEmail} value={inviteEmail} />
                        <ModalPasswordField
                          id="club-invite-signin-password"
                          label={t.auth.password}
                          value={signInPassword}
                          onChange={setSignInPassword}
                          autoComplete="current-password"
                        />
                        <Button
                          type="submit"
                          className={`w-full font-semibold ${clubCtaFillHoverClass}`}
                          style={clubCtaPrimaryInlineStyle(club.primary_color)}
                          disabled={submitting || !signInPassword.trim()}
                        >
                          {submitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                          )}
                          {t.clubPage.memberInviteModalSignInCta}
                        </Button>
                        <button
                          type="button"
                          className="w-full text-center text-xs font-medium text-neutral-600 underline-offset-2 hover:underline"
                          onClick={() => setShowSignIn(false)}
                        >
                          {t.clubPage.memberInviteModalBackToSignup}
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
