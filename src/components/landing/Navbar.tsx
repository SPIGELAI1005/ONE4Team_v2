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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="ONE4Team" className="w-7 h-7" />
          <span className="font-display font-bold text-[15px] text-foreground tracking-tight">
            One<span className="text-gradient-gold">4</span>Team
          </span>
        </motion.div>

        <div className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground font-medium">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#worlds" className="hover:text-foreground transition-colors">Club & Partners</a>
          <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")} className="text-[13px] font-medium rounded-xl">
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/onboarding")}
            className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 rounded-xl text-[13px] shadow-gold"
          >
            Get Started
          </Button>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
        </motion.button>
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
              <motion.a whileTap={{ scale: 0.97 }} href="#features" className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium" onClick={() => setOpen(false)}>Features</motion.a>
              <motion.a whileTap={{ scale: 0.97 }} href="#worlds" className="text-muted-foreground py-2.5 px-3 rounded-xl hover:bg-muted/30 text-[13px] font-medium" onClick={() => setOpen(false)}>Club & Partners</motion.a>
              <Button
                onClick={() => { setOpen(false); navigate("/onboarding"); }}
                className="bg-gradient-gold text-primary-foreground font-semibold rounded-xl mt-1"
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
