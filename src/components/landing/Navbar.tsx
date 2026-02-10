import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <img src={logo} alt="ONE4Team" className="w-8 h-8" />
          <span className="font-display font-bold text-lg text-foreground">
            One<span className="text-gradient-gold">4</span>Team
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#worlds" className="hover:text-foreground transition-colors">Club & Partners</a>
          <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")}>
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/onboarding")}
            className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
          >
            Get Started
          </Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="p-4 flex flex-col gap-3">
              <a href="#features" className="text-muted-foreground py-2" onClick={() => setOpen(false)}>Features</a>
              <a href="#worlds" className="text-muted-foreground py-2" onClick={() => setOpen(false)}>Club & Partners</a>
              <Button
                onClick={() => { setOpen(false); navigate("/onboarding"); }}
                className="bg-gradient-gold text-primary-foreground font-semibold"
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
