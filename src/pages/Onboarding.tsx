import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, Briefcase, ArrowRight, ArrowLeft,
  Shield, Dumbbell, UserCheck, Heart, Crown, Wrench,
  HandCoins, Truck, Scale, Sparkles, Building2, Loader2,
  Link2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/one4team-logo.png";
import { isErrorWithMessage } from "@/types/dashboard";

type World = "club" | "partner" | null;
type Step = "world" | "role" | "create-club" | "redeem-invite";

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const initialWorld = searchParams.get("world") as World;
  const inviteTokenParam = searchParams.get("invite");
  const inviteClubParam = searchParams.get("club");

  const [world, setWorld] = useState<World>(initialWorld);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(inviteTokenParam ? "redeem-invite" : (initialWorld ? "role" : "world"));
  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemToken, setRedeemToken] = useState(inviteTokenParam || "");
  const [redeemSuccess, setRedeemSuccess] = useState<{ role: string; clubId: string | null } | null>(null);
  const [redeemClubName, setRedeemClubName] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const clubRoles = [
    { id: "admin", label: t.onboarding.clubAdmin, icon: Crown, desc: t.onboarding.clubAdminDesc },
    { id: "trainer", label: t.onboarding.trainer, icon: Dumbbell, desc: t.onboarding.trainerDesc },
    { id: "player", label: t.onboarding.player, icon: Shield, desc: t.onboarding.playerDesc },
    { id: "staff", label: t.onboarding.teamStaff, icon: UserCheck, desc: t.onboarding.teamStaffDesc },
    { id: "member", label: t.onboarding.member, icon: Users, desc: t.onboarding.memberDesc },
    { id: "parent", label: t.onboarding.parentSupporter, icon: Heart, desc: t.onboarding.parentSupporterDesc },
  ];

  const partnerRoles = [
    { id: "sponsor", label: t.onboarding.sponsor, icon: HandCoins, desc: t.onboarding.sponsorDesc },
    { id: "supplier", label: t.onboarding.supplier, icon: Truck, desc: t.onboarding.supplierDesc },
    { id: "service_provider", label: t.onboarding.serviceProvider, icon: Wrench, desc: t.onboarding.serviceProviderDesc },
    { id: "consultant", label: t.onboarding.consultant, icon: Scale, desc: t.onboarding.consultantDesc },
  ];

  const canRedeem = useMemo(() => redeemToken.trim().length >= 10, [redeemToken]);

  useEffect(() => {
    // Keep state in sync if user edits URL
    if (inviteTokenParam) {
      setRedeemToken(inviteTokenParam);
      setStep("redeem-invite");
    }
  }, [inviteTokenParam]);

  useEffect(() => {
    const run = async () => {
      if (!inviteClubParam) {
        setRedeemClubName(null);
        return;
      }
      const { data, error } = await supabase
        .from("clubs")
        .select("name")
        .eq("slug", inviteClubParam)
        .maybeSingle();
      if (error) {
        setRedeemClubName(null);
        return;
      }
      setRedeemClubName(data?.name ?? null);
    };
    void run();
  }, [inviteClubParam]);

  const roles = world === "club" ? clubRoles : world === "partner" ? partnerRoles : [];

  const handleSelectWorld = (w: World) => {
    setWorld(w);
    setStep("role");
    setSelectedRole(null);
  };

  const handleBack = () => {
    if (step === "redeem-invite") {
      // If they came here by link, going back should take them to world-select.
      setStep("world");
      setWorld(null);
      setSelectedRole(null);
      return;
    }
    if (step === "create-club") {
      setStep("role");
    } else if (step === "role") {
      setStep("world");
      setWorld(null);
      setSelectedRole(null);
    }
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    // If admin is selected, show Create Club step
    if (selectedRole === "admin" && user) {
      setStep("create-club");
      return;
    }

    navigate(`/dashboard/${selectedRole}`);
  };

  const handleRedeemInvite = async () => {
    if (!user) {
      toast({ title: t.onboarding.signInRequired, description: t.onboarding.signInToRedeem });
      navigate("/auth");
      return;
    }

    if (!canRedeem) return;

    setRedeeming(true);
    setRedeemSuccess(null);
    try {
      const { data, error } = await supabase.rpc("redeem_club_invite", { _token: redeemToken.trim() });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : null;
      const role = (row?.role as string | undefined) || "member";
      const clubId = (row?.club_id as string | undefined) || null;

      if (clubId) {
        localStorage.setItem("one4team.activeClubId", clubId);
      }

      // UX polish: show success glass card briefly before routing.
      setRedeemSuccess({ role, clubId });
      toast({ title: t.onboarding.inviteRedeemed, description: t.onboarding.welcomeToClub });

      window.setTimeout(() => {
        navigate(`/dashboard/${role}`);
      }, 1200);
    } catch (err: unknown) {
      toast({
        title: t.onboarding.inviteFailed,
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleCreateClub = async () => {
    if (!clubName.trim() || !user) return;

    setCreating(true);
    try {
      const slug = clubName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      // Create club and admin membership atomically
      const { data: clubId, error } = await supabase.rpc("create_club_with_admin", {
        _name: clubName.trim(),
        _slug: slug || `club-${Date.now()}`,
        _description: clubDescription.trim() || null,
        _is_public: true,
      });

      if (error) throw error;

      toast({ title: t.onboarding.clubCreated, description: `${clubName} ${t.onboarding.clubReadyToGo}` });
      navigate("/dashboard/admin");
    } catch (err: unknown) {
      toast({
        title: t.onboarding.errorCreatingClub,
        description: isErrorWithMessage(err) ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="ONE4Team" className="w-8 h-8" />
            <span className="font-logo text-lg text-foreground">
              ONE <span className="text-gradient-gold-animated">4</span> Team
            </span>
          </div>
          {step !== "world" && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> {t.common.back}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {step === "redeem-invite" && (
            <motion.div
              key="redeem-invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg"
            >
              <div className="text-center mb-10">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border bg-background/60 backdrop-blur-xl flex items-center justify-center mx-auto mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  Redeem your <span className="text-gradient-gold">invite</span>
                </h1>
                <p className="text-muted-foreground">{t.onboarding.inviteOnlyDesc}</p>
                {redeemClubName && (
                  <div className="mt-3 inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                    {redeemClubName}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-card/55 border border-border/70 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] space-y-4">
                {redeemSuccess ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/45 backdrop-blur-xl p-5">
                    <motion.div
                      aria-hidden
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                      <div className="absolute -bottom-24 left-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
                    </motion.div>

                    <div className="relative flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-foreground tracking-tight">You’re in.</div>
                        <div className="text-xs text-muted-foreground">
                          {t.onboarding.settingUpDashboard}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {t.onboarding.role}: {redeemSuccess.role}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.0, repeat: Infinity }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.0, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.0, repeat: Infinity, delay: 0.3 }}
                      />
                      {t.onboarding.redirecting}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.onboarding.inviteToken}</label>
                      <Input
                        placeholder={t.onboarding.pasteInviteToken}
                        value={redeemToken}
                        onChange={(e) => setRedeemToken(e.target.value)}
                        className="bg-background/60 border-border"
                        maxLength={2000}
                      />
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {t.onboarding.tokenTip}
                      </div>
                    </div>

                    <Button
                      onClick={handleRedeemInvite}
                      disabled={!canRedeem || redeeming}
                      className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 disabled:opacity-40"
                      size="lg"
                    >
                      {redeeming ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.onboarding.redeeming}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> {t.onboarding.joinClub}
                        </>
                      )}
                    </Button>

                    {!user && (
                      <div className="text-xs text-muted-foreground text-center">
                        {t.onboarding.signInBeforeJoin}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === "world" && (

            <motion.div
              key="world-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-12">
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
                  {t.onboarding.chooseYourWorld} <span className="text-gradient-gold">{t.onboarding.worldHighlight}</span>
                </h1>
                <p className="text-muted-foreground text-lg">{t.onboarding.howWillYouUse}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectWorld("club")}
                  className="text-left p-8 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-gold group"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                    <Users className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2 text-foreground">{t.onboarding.clubWorldOnboarding}</h2>
                  <p className="text-muted-foreground mb-4">{t.onboarding.clubWorldOnboardingDesc}</p>
                  <div className="flex items-center text-primary font-medium gap-2 group-hover:gap-3 transition-all">
                    {t.onboarding.enter} <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectWorld("partner")}
                  className="text-left p-8 rounded-2xl border border-border bg-card hover:border-accent/40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(0_65%_50%/0.15)] group"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-5">
                    <Briefcase className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2 text-foreground">{t.onboarding.partnerWorldOnboarding}</h2>
                  <p className="text-muted-foreground mb-4">{t.onboarding.partnerWorldOnboardingDesc}</p>
                  <div className="flex items-center text-accent font-medium gap-2 group-hover:gap-3 transition-all">
                    {t.onboarding.enter} <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === "role" && (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-3xl"
            >
              <div className="text-center mb-10">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${world === "club" ? "bg-gradient-gold" : "bg-accent"}`}>
                  {world === "club" ? <Users className="w-6 h-6 text-primary-foreground" /> : <Briefcase className="w-6 h-6 text-accent-foreground" />}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  {t.onboarding.selectYourRole} <span className="text-gradient-gold">{t.onboarding.roleHighlight}</span>
                </h1>
                <p className="text-muted-foreground">{t.onboarding.multipleRolesHint}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {roles.map((role) => (
                  <motion.button
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={`text-left p-5 rounded-xl border transition-all duration-200 ${
                      selectedRole === role.id
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border bg-card hover:border-primary/20"
                    }`}
                  >
                    <role.icon className={`w-6 h-6 mb-3 ${selectedRole === role.id ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="font-display font-semibold text-foreground text-sm mb-1">{role.label}</h3>
                    <p className="text-xs text-muted-foreground">{role.desc}</p>
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  disabled={!selectedRole}
                  onClick={handleContinue}
                  className="bg-gradient-gold-static text-primary-foreground font-semibold px-8 hover:brightness-110 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {selectedRole === "admin" && user ? t.onboarding.setUpYourClub : t.onboarding.continueToDashboard}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "create-club" && (
            <motion.div
              key="create-club"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg"
            >
              <div className="text-center mb-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  {t.onboarding.createYourClub} <span className="text-gradient-gold">{t.onboarding.clubHighlight}</span>
                </h1>
                <p className="text-muted-foreground">{t.onboarding.clubHomeDesc}</p>
              </div>

              <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.onboarding.clubName}</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t.onboarding.clubNamePlaceholder}
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="pl-9 bg-background border-border"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.onboarding.descriptionOptional}</label>
                  <textarea
                    placeholder={t.onboarding.tellPeopleAbout}
                    value={clubDescription}
                    onChange={(e) => setClubDescription(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {clubName.trim() && (
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{t.onboarding.clubUrl}</span>
                    one4team.com/club/{clubName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
                  </div>
                )}

                <Button
                  onClick={handleCreateClub}
                  disabled={!clubName.trim() || creating}
                  className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 disabled:opacity-40"
                  size="lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.onboarding.creating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> {t.onboarding.createClubEnterDashboard}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
