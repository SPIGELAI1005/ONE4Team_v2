import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="py-12 border-t border-border">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="ONE4Team" className="w-8 h-8" />
          <span className="font-display font-bold text-foreground">ONE4Team</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 ONE4Team. The complete operating system for hobby clubs.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
