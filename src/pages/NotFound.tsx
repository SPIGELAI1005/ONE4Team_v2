import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={t.notFound.title} subtitle={location.pathname} back={false} />
      <div className="container mx-auto px-4 py-14">
        <div className="max-w-md mx-auto rounded-3xl glass-card p-8 text-center">
          <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">{t.notFound.heading}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t.notFound.description}</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t.notFound.goBack}
            </Button>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => navigate("/")}>
              {t.notFound.home}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
