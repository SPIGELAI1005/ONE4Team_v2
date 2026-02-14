import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/one4team-logo.png";

/** Branded hamburger icon inspired by O·4·T — morphs to X when open */
function BrandedMenuIcon({ isOpen }: { isOpen: boolean }) {
  const transition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };

  return (
    <svg width="22" height="18" viewBox="0 0 22 18" className="overflow-visible">
      {/* Top bar — rounded ends hint at the "O" curve */}
      <motion.path
        d="M2 2 L20 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={isOpen
          ? { d: "M4 2 L18 16", stroke: "currentColor" }
          : { d: "M2 2 L20 2", stroke: "currentColor" }
        }
        transition={transition}
      />
      {/* Middle bar — gold accent for the "4", shorter width */}
      <motion.path
        d="M5 9 L17 9"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={isOpen
          ? { d: "M11 9 L11 9", opacity: 0, stroke: "hsl(43, 80%, 55%)" }
          : { d: "M5 9 L17 9", opacity: 1, stroke: "hsl(43, 80%, 55%)" }
        }
        transition={transition}
      />
      {/* Bottom bar — straight like the "T" crossbar */}
      <motion.path
        d="M2 16 L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={isOpen
          ? { d: "M4 16 L18 2", stroke: "currentColor" }
          : { d: "M2 16 L20 16", stroke: "currentColor" }
        }
        transition={transition}
      />
    </svg>
  );
}

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="ONE4Team" className="w-7 h-7" />
          <span className="font-logo text-[15px] text-foreground tracking-tight">
            ONE <span className="text-gradient-gold-animated">4</span> Team
          </span>
        </motion.div>

        <div className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground font-medium">
          <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate("/features")}>{t.navbar.features}</span>
          <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate("/clubs-and-partners")}>{t.navbar.clubsAndPartners}</span>
          <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate("/about")}>{t.navbar.about}</span>
          <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate("/pricing")}>{t.navbar.pricing}</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")} className="text-[13px] font-medium rounded-xl">
            {t.common.signIn}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/onboarding")}
            className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 rounded-xl text-[13px] shadow-gold"
          >
            {t.common.getStarted}
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <LanguageToggle size="sm" />
          <ThemeToggle size="sm" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="text-foreground p-2"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <BrandedMenuIcon isOpen={open} />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="md:hidden glass overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-2">
              <motion.div whileTap={{ scale: 0.97 }} className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium cursor-pointer" onClick={() => { setOpen(false); navigate("/features"); }}>{t.navbar.features}</motion.div>
              <motion.div whileTap={{ scale: 0.97 }} className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium cursor-pointer" onClick={() => { setOpen(false); navigate("/clubs-and-partners"); }}>{t.navbar.clubsAndPartners}</motion.div>
              <motion.div whileTap={{ scale: 0.97 }} className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium cursor-pointer" onClick={() => { setOpen(false); navigate("/about"); }}>{t.navbar.about}</motion.div>
              <motion.div whileTap={{ scale: 0.97 }} className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium cursor-pointer" onClick={() => { setOpen(false); navigate("/pricing"); }}>{t.navbar.pricing}</motion.div>
              <Button
                onClick={() => { setOpen(false); navigate("/onboarding"); }}
                className="bg-gradient-gold-static text-primary-foreground font-semibold rounded-xl mt-1"
              >
                {t.common.getStarted}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
