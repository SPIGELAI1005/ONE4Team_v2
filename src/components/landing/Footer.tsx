import logo from "@/assets/one4team-logo.png";
import { useLanguage } from "@/hooks/use-language";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="py-8 sm:py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="ONE4Team" className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="font-logo text-sm sm:text-base text-foreground">
              ONE <span className="text-gradient-gold-animated">4</span> Team
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
