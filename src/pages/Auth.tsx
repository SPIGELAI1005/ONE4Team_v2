import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: t.auth.loginFailed, description: error.message, variant: "destructive" });
      } else {
        navigate("/onboarding");
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({ title: t.auth.signupFailed, description: error.message, variant: "destructive" });
      } else {
        toast({
          title: t.auth.checkEmail,
          description: t.auth.checkEmailDesc,
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <AppHeader title="ONE4Team" subtitle={mode === "login" ? t.common.signIn : t.auth.createAccount} back={false} />

      {/* Animated football field background */}
      <div className="absolute inset-0">
        <FootballFieldAnimation lang={language} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:from-background/80 dark:via-background/40 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 dark:from-background/60 dark:via-transparent dark:to-background/60" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-[12vh] relative z-10">

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
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

        {/* iOS segmented control for mode */}
        <div className="ios-segment flex mb-6">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-200 ${
                mode === m ? "ios-segment-active text-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "login" ? t.common.signIn : t.common.signUp}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-2xl glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{t.auth.fullName}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    placeholder={t.auth.yourName}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-9 glass-input rounded-xl text-[13px] h-11"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 glass-input rounded-xl text-[13px] h-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{t.auth.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 glass-input rounded-xl text-[13px] h-11"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 rounded-xl h-11 text-[13px] shadow-gold haptic-press"
            >
              {loading ? t.auth.pleaseWait : mode === "login" ? t.common.signIn : t.auth.createAccount}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login" ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}
              <span className="text-primary font-medium">
                {mode === "login" ? t.common.signUp : t.common.signIn}
              </span>
            </button>
          </div>
        </div>

        {/* Back to Landing Page pill */}
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
