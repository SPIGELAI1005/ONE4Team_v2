import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Trophy, Globe, Check, ArrowRight, ArrowLeft,
  Loader2, Sparkles, UserPlus, Copy, Link2
} from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import logo from "@/assets/one4team-logo.png";

type Step = "welcome" | "team" | "invite" | "club-page" | "complete";

const STEPS: Step[] = ["welcome", "team", "invite", "club-page", "complete"];

export default function GuidedSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("welcome");
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamAgeGroup, setTeamAgeGroup] = useState("Senior");

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [clubDescription, setClubDescription] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const ageGroupOptions = [
    { value: "Youth", label: t.guidedSetupPage.ageYouth },
    { value: "Junior", label: t.guidedSetupPage.ageJunior },
    { value: "Senior", label: t.guidedSetupPage.ageSenior },
  ];

  const goNext = () => {
    const nextIdx = Math.min(stepIndex + 1, STEPS.length - 1);
    setStep(STEPS[nextIdx]);
  };

  const goBack = () => {
    const prevIdx = Math.max(stepIndex - 1, 0);
    setStep(STEPS[prevIdx]);
  };

  const handleCreateTeam = async () => {
    if (!clubId || !teamName.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("teams").insert({
        club_id: clubId,
        name: teamName.trim(),
        age_group: teamAgeGroup,
        is_active: true,
      });
      if (error) throw error;
      toast({
        title: t.guidedSetupPage.teamCreatedTitle,
        description: t.guidedSetupPage.teamCreatedDesc.replace("{name}", teamName.trim()),
      });
      goNext();
    } catch (err) {
      toast({ title: t.common.error, description: err instanceof Error ? err.message : t.guidedSetupPage.teamCreateFailed, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!clubId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_club_invite", {
        _club_id: clubId,
        _max_uses: 50,
        _expires_in_days: 14,
        _payload: { source: "guided_setup" },
      });
      if (error) throw error;
      const token = typeof data === "string" ? data : (data as { token?: string })?.token ?? String(data);
      setInviteToken(token);
      toast({ title: t.guidedSetupPage.inviteCreatedTitle, description: t.guidedSetupPage.inviteCreatedDesc });
    } catch (err) {
      toast({ title: t.common.error, description: err instanceof Error ? err.message : t.guidedSetupPage.inviteCreateFailed, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateClubPage = async () => {
    if (!clubId) return;
    setBusy(true);
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (clubDescription.trim()) updates.description = clubDescription.trim();

      const { error } = await supabaseDynamic
        .from("clubs")
        .update(updates)
        .eq("id", clubId);
      if (error) throw error;
      toast({ title: t.guidedSetupPage.clubUpdatedTitle });
      goNext();
    } catch (err) {
      toast({ title: t.common.error, description: err instanceof Error ? err.message : t.guidedSetupPage.clubUpdateFailed, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const inviteLink = inviteToken ? `${window.location.origin}/onboarding?invite=${inviteToken}` : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-gold-static"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                <img src={logo} alt="" className="w-16 h-16 mx-auto mb-6" />
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">
                  {t.guidedSetupPage.welcomeTitle}
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                  {t.guidedSetupPage.welcomeBody}
                </p>
                <div className="grid gap-4 max-w-sm mx-auto mb-8">
                  {[
                    { icon: Trophy, label: t.guidedSetupPage.stepCreateTeam, step: 1 },
                    { icon: UserPlus, label: t.guidedSetupPage.stepInvite, step: 2 },
                    { icon: Globe, label: t.guidedSetupPage.stepClubPage, step: 3 },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {item.step}
                      </div>
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={goNext} className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110">
                    {t.guidedSetupPage.letsGo} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/admin")}>
                    {t.guidedSetupPage.skipSetup}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "team" && (
              <motion.div key="team" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t.guidedSetupPage.teamStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{t.guidedSetupPage.teamStepDesc}</p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t.guidedSetupPage.teamNameLabel}</label>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t.guidedSetupPage.teamNamePlaceholder} maxLength={100} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t.guidedSetupPage.ageGroupLabel}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ageGroupOptions.map((ag) => (
                        <button
                          key={ag.value}
                          type="button"
                          onClick={() => setTeamAgeGroup(ag.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            teamAgeGroup === ag.value
                              ? "bg-gradient-gold-static text-primary-foreground shadow-gold"
                              : "glass-card text-foreground hover:border-primary/20"
                          }`}
                        >
                          {ag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t.guidedSetupPage.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{t.guidedSetupPage.skip}</Button>
                    <Button
                      onClick={() => void handleCreateTeam()}
                      disabled={!teamName.trim() || busy}
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      {t.guidedSetupPage.createContinue}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "invite" && (
              <motion.div key="invite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t.guidedSetupPage.inviteStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{t.guidedSetupPage.inviteStepDesc}</p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  {!inviteToken ? (
                    <Button
                      onClick={() => void handleCreateInvite()}
                      disabled={busy}
                      className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {t.guidedSetupPage.generateInviteLink}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">{t.guidedSetupPage.shareLinkHint}</div>
                      <div className="font-mono text-xs text-foreground bg-background/60 rounded-xl p-3 break-all border border-border/60">
                        {inviteLink}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleCopy(inviteLink || "")}
                        >
                          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copied ? t.guidedSetupPage.copied : t.guidedSetupPage.copyLink}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleCopy(`${window.location.origin}/onboarding?invite=${inviteToken}`)}
                        >
                          <Link2 className="w-4 h-4 mr-1" /> {t.guidedSetupPage.copyToken}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/60 pt-4">
                    <label className="text-xs text-muted-foreground mb-1 block">{t.guidedSetupPage.emailsLabel}</label>
                    <textarea
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder={t.guidedSetupPage.emailsPlaceholder}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      rows={4}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t.guidedSetupPage.emailsHint}</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t.guidedSetupPage.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{t.guidedSetupPage.skip}</Button>
                    <Button onClick={goNext} className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110">
                      {t.guidedSetupPage.continue} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "club-page" && (
              <motion.div key="club-page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t.guidedSetupPage.clubPageStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{t.guidedSetupPage.clubPageStepDesc}</p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t.guidedSetupPage.clubDescriptionLabel}</label>
                    <textarea
                      value={clubDescription}
                      onChange={(e) => setClubDescription(e.target.value)}
                      placeholder={t.guidedSetupPage.clubDescriptionPlaceholder}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t.guidedSetupPage.charCount.replace("{count}", String(clubDescription.length))}</p>
                  </div>

                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                    <div className="text-xs font-medium text-foreground mb-1">{t.guidedSetupPage.customizeLaterTitle}</div>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5">
                      <li>• {t.guidedSetupPage.customizeLaterLogo}</li>
                      <li>• {t.guidedSetupPage.customizeLaterBranding}</li>
                      <li>• {t.guidedSetupPage.customizeLaterContact}</li>
                      <li>• {t.guidedSetupPage.customizeLaterJoin}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t.guidedSetupPage.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{t.guidedSetupPage.skip}</Button>
                    <Button
                      onClick={() => void handleUpdateClubPage()}
                      disabled={busy}
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      {t.guidedSetupPage.saveFinish}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-gold-static flex items-center justify-center mx-auto mb-6"
                >
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-3">{t.guidedSetupPage.completeTitle}</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                  {t.guidedSetupPage.completeBody}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button
                    onClick={() => navigate("/dashboard/admin")}
                    className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                  >
                    {t.guidedSetupPage.openDashboard} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/club-page-admin")}>
                    {t.guidedSetupPage.customizeClubPage}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/members")}>
                    {t.guidedSetupPage.manageMembers}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                i <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
