import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ListOrdered, Loader2, LogIn, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubHero } from "@/components/public-club/public-club-hero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { isMissingRelationError } from "@/lib/public-club-models";
import { trackEvent } from "@/lib/telemetry";

type JoinRoleId = "player" | "parent" | "coach" | "volunteer" | "sponsor" | "partner";

interface PublicFaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const JOIN_ROLES: { id: JoinRoleId }[] = [
  { id: "player" },
  { id: "parent" },
  { id: "coach" },
  { id: "volunteer" },
  { id: "sponsor" },
  { id: "partner" },
];

function joinRoleLabel(
  id: JoinRoleId,
  p: {
    joinRolePlayer: string;
    joinRoleParent: string;
    joinRoleCoach: string;
    joinRoleVolunteer: string;
    joinRoleSponsor: string;
    joinRolePartner: string;
  }
) {
  switch (id) {
    case "player":
      return p.joinRolePlayer;
    case "parent":
      return p.joinRoleParent;
    case "coach":
      return p.joinRoleCoach;
    case "volunteer":
      return p.joinRoleVolunteer;
    case "sponsor":
      return p.joinRoleSponsor;
    case "partner":
      return p.joinRolePartner;
    default:
      return id;
  }
}

function splitDisplayName(displayName: string): { first: string; last: string } {
  const t = displayName.trim();
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export default function PublicClubJoinPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { club, user, basePath, searchSuffix, goToAuthWithReturn, canRequestInvite } = usePublicClub();
  const [faq, setFaq] = useState<PublicFaqRow[]>([]);
  const [role, setRole] = useState<JoinRoleId>("player");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  /** Anti-bot honeypot: must stay empty (not shown to visitors). */
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!club?.id) return;
    void (async () => {
      const faqRes = await supabase
        .from("club_public_faq_items")
        .select("id, question, answer, sort_order")
        .eq("club_id", club.id)
        .eq("is_public", true)
        .order("sort_order", { ascending: true })
        .limit(40);
      if (!faqRes.error) setFaq((faqRes.data as PublicFaqRow[]) || []);
      else if (!isMissingRelationError(faqRes.error)) setFaq([]);
    })();
  }, [club?.id]);

  useEffect(() => {
    const displayName = (user?.user_metadata?.display_name as string | undefined) || "";
    if (user) {
      const { first, last } = splitDisplayName(displayName);
      if (first && !firstName) setFirstName(first);
      if (last && !lastName) setLastName(last);
      if (user.email && !email) setEmail(user.email);
    }
  }, [email, firstName, lastName, user]);

  const step2Desc = useMemo(() => {
    if (!club || club.join_approval_mode !== "auto") return t.clubPage.joinStep2DescManual;
    if (club.join_auto_approve_invited_only) return t.clubPage.joinStep2DescAutoInvitedOnly;
    return t.clubPage.joinStep2DescAuto;
  }, [club, t.clubPage.joinStep2DescAuto, t.clubPage.joinStep2DescAutoInvitedOnly, t.clubPage.joinStep2DescManual]);

  const headline = club ? t.clubPage.joinPageHeroLine.replace("{clubName}", club.name) : "";

  const submit = useCallback(async () => {
    if (!club) return;
    if (!canRequestInvite) {
      toast({ title: t.clubPage.inviteRequestsDisabled, description: t.clubPage.notAcceptingRequests });
      return;
    }
    if (!consent) {
      toast({ title: t.clubPage.joinConsentRequired, variant: "destructive" });
      return;
    }
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      toast({ title: t.clubPage.joinValidationFirstName, variant: "destructive" });
      return;
    }
    if (!ln) {
      toast({ title: t.clubPage.joinValidationLastName, variant: "destructive" });
      return;
    }
    if (!user) {
      const em = email.trim().toLowerCase();
      if (!em || !em.includes("@")) {
        toast({ title: t.clubPage.joinValidationEmail, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (user) {
        const { data, error } = await supabaseDynamic.rpc("register_club_join_request", {
          _club_id: club.id,
          _name: `${fn} ${ln}`.trim(),
          _message: message.trim() || null,
          _phone: phone.trim() || null,
          _interested_role: role,
          _interested_team: team.trim() || null,
          _consent: true,
          _first_name: fn,
          _last_name: ln,
          _website_url: companyWebsite.trim() || null,
        });
        if (error) throw error;
        const row = (Array.isArray(data) ? data[0] : null) as { outcome?: string; role?: string } | null;
        const outcome = row?.outcome || "pending";
        const appRole = (row?.role as string) || "member";

        if (outcome === "joined") {
          trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "joined", role: appRole });
          localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
          localStorage.setItem("one4team.activeRole", appRole);
          toast({ title: t.clubPage.joinApproved, description: t.clubPage.joinApprovedDesc });
          navigate(`/dashboard/${appRole}`);
          return;
        }
        if (outcome === "already_member") {
          trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "already_member" });
          localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
          toast({ title: t.clubPage.alreadyMember, description: t.clubPage.alreadyMemberDesc });
          navigate(`/dashboard/${localStorage.getItem("one4team.activeRole") || "player"}`);
          return;
        }
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "pending_review" });
        setSent(true);
        toast({ title: t.clubPage.requestSent, description: t.clubPage.requestSentDesc });
      } else {
        const { error } = await supabaseDynamic.rpc("request_club_invite", {
          _club_id: club.id,
          _first_name: fn,
          _last_name: ln,
          _email: email.trim(),
          _message: message.trim() || null,
          _phone: phone.trim() || null,
          _interested_role: role,
          _interested_team: team.trim() || null,
          _consent: true,
          _website_url: companyWebsite.trim() || null,
        });
        if (error) throw error;
        trackEvent("club_public_invite_request", { clubSlug: club.slug });
        setSent(true);
        toast({ title: t.clubPage.joinFormSuccessTitle, description: t.clubPage.joinFormSuccessBody });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unable to submit request")) {
        toast({ title: t.clubPage.joinSpamRejectedTitle, description: t.clubPage.joinSpamRejectedDesc, variant: "destructive" });
      } else if (msg.includes("Too many requests") || msg.includes("rate_limit") || msg.includes("429")) {
        toast({ title: t.clubPage.rateLimitReachedTitle, description: t.clubPage.rateLimitReachedDesc, variant: "destructive" });
      } else {
        toast({ title: t.common.error, description: msg, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    canRequestInvite,
    club,
    companyWebsite,
    consent,
    email,
    firstName,
    lastName,
    message,
    navigate,
    phone,
    role,
    t,
    team,
    toast,
    user,
  ]);

  if (!club) return null;

  const joinRequestsDisabled = Boolean(club.is_public && !club.micrositePrivacy.allowJoinRequestsPublic);

  return (
    <PublicClubPageGate section="join">
      <PublicClubHero
        club={club}
        headline={headline}
        subtitle={t.clubPage.joinPageIntro}
        footNote={user ? <span className="text-white/80">{t.clubPage.joinSignedInHint}</span> : null}
      />

      {joinRequestsDisabled ? (
        <PublicClubSection title={<span className="text-[color:var(--club-primary)]">{t.clubPage.joinDisabledTitle}</span>}>
          <PublicClubCard className="mx-auto max-w-xl text-center text-sm leading-relaxed text-[color:var(--club-muted)]">
            {t.clubPage.joinDisabledByPrivacy}
          </PublicClubCard>
        </PublicClubSection>
      ) : null}

      {!joinRequestsDisabled ? (
        <>
          <PublicClubSection title={<span className="text-[color:var(--club-primary)]">{t.clubPage.joinRolesTitle}</span>}>
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
              {JOIN_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors sm:px-5",
                    role === r.id
                      ? "border-transparent text-white"
                      : "border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]",
                  ].join(" ")}
                  style={role === r.id ? { backgroundColor: "var(--club-primary)" } : undefined}
                >
                  {joinRoleLabel(r.id, t.clubPage)}
                </button>
              ))}
            </div>
          </PublicClubSection>

          <PublicClubSection title={<span className="text-[color:var(--club-primary)]">{t.clubPage.joinStepsTitle}</span>}>
            <div className="mx-auto grid max-w-5xl gap-4 text-left sm:grid-cols-3">
              {[
                { title: t.clubPage.joinStep1Title, desc: t.clubPage.joinStep1Desc, icon: Send },
                { title: t.clubPage.joinStep2Title, desc: step2Desc, icon: ListOrdered },
                { title: t.clubPage.joinStep3Title, desc: t.clubPage.joinStep3Desc, icon: CheckCircle2 },
              ].map((s, i) => (
                <PublicClubCard key={i} className="flex flex-col gap-2">
                  <s.icon className="h-8 w-8 text-[color:var(--club-primary)]" />
                  <div className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{s.title}</div>
                  <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{s.desc}</p>
                </PublicClubCard>
              ))}
            </div>
          </PublicClubSection>

          <PublicClubSection title={<span className="text-[color:var(--club-primary)]">{t.clubPage.joinFormTitle}</span>}>
            <div className="mx-auto max-w-xl text-left">
              {sent ? (
                <PublicClubCard className="text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-[color:var(--club-primary)]" />
                  <h3 className="font-display text-lg font-semibold text-[color:var(--club-foreground)]">{t.clubPage.joinFormSuccessTitle}</h3>
                  <p className="mt-2 text-sm text-[color:var(--club-muted)]">{t.clubPage.joinFormSuccessBody}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 border-[color:var(--club-border)]"
                    onClick={() => {
                      setSent(false);
                      setMessage("");
                    }}
                  >
                    {t.clubPage.joinFormAnother}
                  </Button>
                </PublicClubCard>
              ) : (
                <PublicClubCard className="relative space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="join-first" className="text-[color:var(--club-foreground)]">
                        {t.clubPage.joinFormFirstName}
                      </Label>
                      <Input
                        id="join-first"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
                        maxLength={80}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="join-last" className="text-[color:var(--club-foreground)]">
                        {t.clubPage.joinFormLastName}
                      </Label>
                      <Input
                        id="join-last"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
                        maxLength={80}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  {!user ? (
                    <div className="space-y-2">
                      <Label htmlFor="join-email" className="text-[color:var(--club-foreground)]">
                        {t.clubPage.joinFormEmail}
                      </Label>
                      <Input
                        id="join-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
                        maxLength={254}
                        autoComplete="email"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="join-phone" className="text-[color:var(--club-foreground)]">
                      {t.clubPage.joinFormPhone}
                    </Label>
                    <Input
                      id="join-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
                      maxLength={40}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[color:var(--club-foreground)]">{t.clubPage.joinFormRole}</Label>
                    <div className="text-sm text-[color:var(--club-muted)]">{joinRoleLabel(role, t.clubPage)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="join-team" className="text-[color:var(--club-foreground)]">
                      {t.clubPage.joinFormTeam}
                    </Label>
                    <Input
                      id="join-team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="join-msg" className="text-[color:var(--club-foreground)]">
                      {t.clubPage.joinFormMessage}
                    </Label>
                    <textarea
                      id="join-msg"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      maxLength={800}
                      className="w-full rounded-xl border border-[color:var(--club-border)] bg-white/5 px-3 py-2 text-sm text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)]"
                    />
                  </div>
                  <div className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
                    <input
                      tabIndex={-1}
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="join-consent"
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-1 border-[color:var(--club-border)] data-[state=checked]:bg-[color:var(--club-primary)] data-[state=checked]:text-white"
                    />
                    <Label htmlFor="join-consent" className="cursor-pointer text-sm leading-snug text-[color:var(--club-muted)]">
                      {t.clubPage.joinFormConsent}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    disabled={
                      submitting ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !consent ||
                      (!user && (!email.trim() || !email.includes("@")))
                    }
                    className="w-full font-semibold text-white hover:brightness-110 disabled:opacity-40"
                    style={{ backgroundColor: "var(--club-primary)" }}
                    onClick={() => void submit()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.clubPage.joinFormSending}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> {t.clubPage.joinFormSubmit}
                      </>
                    )}
                  </Button>
                </PublicClubCard>
              )}
            </div>
          </PublicClubSection>
        </>
      ) : null}

      {faq.length > 0 ? (
        <PublicClubSection id="faq" title={<span className="text-[color:var(--club-primary)]">{t.clubPage.joinFaqTitle}</span>}>
          <div className="mx-auto max-w-3xl text-left">
            <Accordion type="single" collapsible className="w-full rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-2">
              {faq.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-[color:var(--club-border)]">
                  <AccordionTrigger className="text-left text-[color:var(--club-foreground)] hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[color:var(--club-muted)]">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </PublicClubSection>
      ) : null}

      <PublicClubSection>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-6 py-8 text-center">
          <LogIn className="h-8 w-8 text-[color:var(--club-primary)]" />
          <div className="font-display text-lg font-semibold text-[color:var(--club-foreground)]">{t.clubPage.joinAlreadyInvited}</div>
          <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.joinSignInCta}</p>
          <Button
            type="button"
            variant="outline"
            className="border-[color:var(--club-border)]"
            onClick={() => goToAuthWithReturn(`${basePath}${searchSuffix}`)}
          >
            {t.clubPage.joinSignInCta}
          </Button>
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
