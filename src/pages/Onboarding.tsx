import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, Briefcase, ArrowRight, ArrowLeft,
  Shield, Dumbbell, UserCheck, Heart, Crown, Wrench,
  HandCoins, Truck, Scale, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

type World = "club" | "partner" | null;

const clubRoles = [
  { id: "admin", label: "Club Admin", icon: Crown, desc: "Full club management access" },
  { id: "trainer", label: "Trainer", icon: Dumbbell, desc: "Manage training, teams & squads" },
  { id: "player", label: "Player", icon: Shield, desc: "View schedule, stats & team info" },
  { id: "staff", label: "Team Staff", icon: UserCheck, desc: "Support team operations" },
  { id: "member", label: "Member", icon: Users, desc: "General club membership" },
  { id: "parent", label: "Parent / Supporter", icon: Heart, desc: "Follow your child's activities" },
];

const partnerRoles = [
  { id: "sponsor", label: "Sponsor", icon: HandCoins, desc: "Manage sponsorship & visibility" },
  { id: "supplier", label: "Supplier", icon: Truck, desc: "Provide goods & equipment" },
  { id: "service", label: "Service Provider", icon: Wrench, desc: "Offer services to clubs" },
  { id: "consultant", label: "Consultant", icon: Scale, desc: "Finance, tax, or legal advisory" },
];

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const initialWorld = searchParams.get("world") as World;
  const [world, setWorld] = useState<World>(initialWorld);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const roles = world === "club" ? clubRoles : world === "partner" ? partnerRoles : [];

  const handleContinue = () => {
    if (selectedRole) {
      navigate(`/dashboard/${selectedRole}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="ONE4Team" className="w-8 h-8" />
            <span className="font-display font-bold text-lg text-foreground">
              One<span className="text-gradient-gold">4</span>Team
            </span>
          </div>
          {world && (
            <Button variant="ghost" size="sm" onClick={() => { setWorld(null); setSelectedRole(null); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {!world ? (
            /* World Selection */
            <motion.div
              key="world-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-12">
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
                  Choose your <span className="text-gradient-gold">world</span>
                </h1>
                <p className="text-muted-foreground text-lg">How will you use ONE4Team?</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWorld("club")}
                  className="text-left p-8 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-gold group"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5">
                    <Users className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2 text-foreground">Club World</h2>
                  <p className="text-muted-foreground mb-4">Players, trainers, admins, members, and supporters.</p>
                  <div className="flex items-center text-primary font-medium gap-2 group-hover:gap-3 transition-all">
                    Enter <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWorld("partner")}
                  className="text-left p-8 rounded-2xl border border-border bg-card hover:border-accent/40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(0_65%_50%/0.15)] group"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-5">
                    <Briefcase className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2 text-foreground">Partner World</h2>
                  <p className="text-muted-foreground mb-4">Sponsors, suppliers, service providers, and consultants.</p>
                  <div className="flex items-center text-accent font-medium gap-2 group-hover:gap-3 transition-all">
                    Enter <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            /* Role Selection */
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
                  Select your <span className="text-gradient-gold">role</span>
                </h1>
                <p className="text-muted-foreground">You can hold multiple roles — choose your primary one to start.</p>
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
                  className="bg-gradient-gold text-primary-foreground font-semibold px-8 hover:opacity-90 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Continue to Dashboard
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
