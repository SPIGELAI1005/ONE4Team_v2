import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Trophy, Globe, Check, ArrowRight, ArrowLeft,
  Loader2, Sparkles, UserPlus, Copy, Link2, Upload, FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { trackUsageEvent } from "@/lib/usage-events";
import {
  commitGuidedMemberImport,
  ensureSharedInviteLink,
  GUIDED_IMPORT_MAX,
  parseInviteEmails,
  previewGuidedMemberImport,
  publishGuidedClubPage,
  sendGuidedInviteEmails,
  type GuidedImportPreviewRow,
} from "@/lib/guided-setup-launch";
import logo from "@/assets/one4team-logo.png";

type Step = "welcome" | "team" | "import" | "invite" | "publish" | "complete";

const STEPS: Step[] = ["welcome", "team", "import", "invite", "publish", "complete"];

export default function GuidedSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("welcome");
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamAgeGroup, setTeamAgeGroup] = useState("Senior");

  const [importRows, setImportRows] = useState<GuidedImportPreviewRow[]>([]);
  const [importTruncated, setImportTruncated] = useState(false);
  const [importSaved, setImportSaved] = useState(0);

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSendSummary, setInviteSendSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [clubDescription, setClubDescription] = useState("");
  const [published, setPublished] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const gs = t.guidedSetupPage;

  const ageGroupOptions = [
    { value: "Youth", label: gs.ageYouth },
    { value: "Junior", label: gs.ageJunior },
    { value: "Senior", label: gs.ageSenior },
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
      });
      if (error) throw error;
      trackUsageEvent({
        eventName: "team_created",
        clubId,
        moduleKey: "trainings",
        metadata: { source: "guided_setup" },
      });
      toast({
        title: gs.teamCreatedTitle,
        description: gs.teamCreatedDesc.replace("{name}", teamName.trim()),
      });
      goNext();
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.teamCreateFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setBusy(true);
    try {
      const preview = await previewGuidedMemberImport(file);
      setImportRows(preview.rows);
      setImportTruncated(preview.truncated);
      if (!preview.rows.length) {
        toast({
          title: gs.importEmptyTitle,
          description: gs.importEmptyDesc,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.importFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCommitImport = async () => {
    if (!clubId || importRows.length === 0) return;
    setBusy(true);
    try {
      const result = await commitGuidedMemberImport({ clubId, rows: importRows });
      setImportSaved(result.saved);
      toast({
        title: gs.importSavedTitle,
        description: gs.importSavedDesc
          .replace("{saved}", String(result.saved))
          .replace("{skipped}", String(result.skipped)),
      });
      goNext();
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.importFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!clubId) return;
    setBusy(true);
    try {
      const result = await ensureSharedInviteLink(clubId);
      if ("error" in result) throw new Error(result.error);
      setInviteToken(result.token);
      toast({ title: gs.inviteCreatedTitle, description: gs.inviteCreatedDesc });
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.inviteCreateFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendInviteEmails = async () => {
    if (!clubId) return;
    const emails = parseInviteEmails(inviteEmails);
    if (!emails.length) {
      toast({ title: gs.emailsNeededTitle, description: gs.emailsNeededDesc, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (!inviteToken) {
        const link = await ensureSharedInviteLink(clubId);
        if ("token" in link) setInviteToken(link.token);
      }
      const result = await sendGuidedInviteEmails({
        clubId,
        emails,
        language: language === "de" ? "de" : "en",
      });
      const summary = gs.emailsSendSummary
        .replace("{sent}", String(result.sent))
        .replace("{failed}", String(result.failed));
      setInviteSendSummary(summary);
      toast({
        title: gs.emailsSendTitle,
        description: summary,
        variant: result.failed && !result.sent ? "destructive" : "default",
      });
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.inviteCreateFailed,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (!clubId) return;
    setBusy(true);
    try {
      const result = await publishGuidedClubPage({
        clubId,
        userId: user?.id ?? null,
        description: clubDescription,
      });
      if (!result.ok) throw new Error(result.error);
      setPublished(true);
      toast({ title: gs.publishSuccessTitle, description: gs.publishSuccessDesc });
      goNext();
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : gs.publishFailed,
        variant: "destructive",
      });
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
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">{gs.welcomeTitle}</h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">{gs.welcomeBody}</p>
                <div className="grid gap-3 max-w-sm mx-auto mb-8">
                  {[
                    { icon: Trophy, label: gs.stepCreateTeam, n: 1 },
                    { icon: FileSpreadsheet, label: gs.stepImport, n: 2 },
                    { icon: UserPlus, label: gs.stepInvite, n: 3 },
                    { icon: Globe, label: gs.stepPublish, n: 4 },
                  ].map((item) => (
                    <div key={item.n} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {item.n}
                      </div>
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground text-left">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={goNext} className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110">
                    {gs.letsGo} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/admin")}>
                    {gs.skipSetup}
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
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{gs.teamStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{gs.teamStepDesc}</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{gs.teamNameLabel}</label>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={gs.teamNamePlaceholder} maxLength={100} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{gs.ageGroupLabel}</label>
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
                    <ArrowLeft className="w-4 h-4 mr-2" /> {gs.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{gs.skip}</Button>
                    <Button
                      onClick={() => void handleCreateTeam()}
                      disabled={!teamName.trim() || busy}
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      {gs.createContinue}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "import" && (
              <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{gs.importStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{gs.importStepDesc.replace("{max}", String(GUIDED_IMPORT_MAX))}</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleImportFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {gs.importUpload}
                  </Button>
                  {importRows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {gs.importPreviewCount.replace("{count}", String(importRows.length))}
                        {importTruncated ? ` ${gs.importTruncatedHint.replace("{max}", String(GUIDED_IMPORT_MAX))}` : ""}
                      </div>
                      <ul className="max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-2 text-xs space-y-1">
                        {importRows.map((row) => (
                          <li key={row.email} className="flex justify-between gap-2 px-1 py-0.5">
                            <span className="truncate text-foreground">{row.name}</span>
                            <span className="shrink-0 text-muted-foreground">{row.email}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{gs.importHint}</p>
                  )}
                  {importSaved > 0 ? (
                    <p className="text-xs text-primary">{gs.importAlreadySaved.replace("{count}", String(importSaved))}</p>
                  ) : null}
                </div>
                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {gs.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{gs.skip}</Button>
                    <Button
                      onClick={() => void handleCommitImport()}
                      disabled={busy || importRows.length === 0}
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      {gs.importContinue}
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
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{gs.inviteStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{gs.inviteStepDesc}</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  {!inviteToken ? (
                    <Button
                      onClick={() => void handleCreateInviteLink()}
                      disabled={busy}
                      className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {gs.generateInviteLink}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">{gs.shareLinkHint}</div>
                      <div className="font-mono text-xs text-foreground bg-background/60 rounded-xl p-3 break-all border border-border/60">
                        {inviteLink}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => handleCopy(inviteLink || "")}>
                          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copied ? gs.copied : gs.copyLink}
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => handleCopy(inviteToken)}>
                          <Link2 className="w-4 h-4 mr-1" /> {gs.copyToken}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-4 space-y-2">
                    <label className="text-xs text-muted-foreground mb-1 block">{gs.emailsLabel}</label>
                    <textarea
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder={gs.emailsPlaceholder}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      rows={4}
                    />
                    <p className="text-[10px] text-muted-foreground">{gs.emailsHint}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={busy || !parseInviteEmails(inviteEmails).length}
                      onClick={() => void handleSendInviteEmails()}
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {gs.sendEmails}
                    </Button>
                    {inviteSendSummary ? (
                      <p className="text-xs text-muted-foreground">{inviteSendSummary}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {gs.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{gs.skip}</Button>
                    <Button onClick={goNext} className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110">
                      {gs.continue} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "publish" && (
              <motion.div key="publish" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-gold-subtle flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">{gs.publishStepTitle}</h2>
                  <p className="text-sm text-muted-foreground">{gs.publishStepDesc}</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{gs.clubDescriptionLabel}</label>
                    <textarea
                      value={clubDescription}
                      onChange={(e) => setClubDescription(e.target.value)}
                      placeholder={gs.clubDescriptionPlaceholder}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{gs.charCount.replace("{count}", String(clubDescription.length))}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                    <div className="text-xs font-medium text-foreground mb-1">{gs.customizeLaterTitle}</div>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5">
                      <li>• {gs.customizeLaterLogo}</li>
                      <li>• {gs.customizeLaterBranding}</li>
                      <li>• {gs.customizeLaterContact}</li>
                      <li>• {gs.customizeLaterJoin}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3 justify-between mt-6">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {gs.back}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">{gs.skip}</Button>
                    <Button
                      onClick={() => void handlePublish()}
                      disabled={busy}
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    >
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      {gs.publishContinue}
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
                <h2 className="font-display text-3xl font-bold text-foreground mb-3">{gs.completeTitle}</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                  {published ? gs.completeBodyPublished : gs.completeBody}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button
                    onClick={() => navigate("/dashboard/admin")}
                    className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                  >
                    {gs.openDashboard} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/club-page-admin")}>
                    {gs.customizeClubPage}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/members")}>
                    {gs.manageMembers}
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
              className={`w-2 h-2 rounded-full transition-all ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
