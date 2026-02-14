import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import logo from "@/assets/one4team-logo.png";
import { useLanguage } from "@/hooks/use-language";

/** X.com (Twitter) icon — inline SVG since lucide doesn't include it */
function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const Footer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const legalLinks = [
    { label: t.footer.termsOfService, path: "/terms" },
    { label: t.footer.privacyPolicy, path: "/privacy" },
    { label: t.footer.legalNotice, path: "/impressum" },
  ];

  return (
    <footer className="py-8 sm:py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          {/* Top row: Logo + social | Legal links */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Logo + social icons */}
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={logo} alt="ONE4Team" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="font-logo text-sm sm:text-base text-foreground">
                ONE <span className="text-gradient-gold-animated">4</span> Team
              </span>
              <div className="flex items-center gap-2 ml-2 border-l border-border/60 pl-3">
                <a
                  href="https://x.com/CO_FE_X"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                  title="X.com"
                >
                  <XIcon className="w-4 h-4" />
                </a>
                <a
                  href="mailto:spigelai@gmail.com"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                  title="Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Legal links */}
            <nav className="flex items-center gap-4 sm:gap-6">
              {legalLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom: Copyright */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
