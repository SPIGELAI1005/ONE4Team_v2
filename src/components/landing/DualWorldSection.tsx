import { motion } from "framer-motion";
import { Users, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DualWorldSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Two worlds.{" "}
            <span className="text-gradient-gold">One platform.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're managing the club or partnering with it — ONE4Team has your dedicated experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Club World */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate("/onboarding?world=club")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-10 hover:border-primary/40 transition-all duration-500 hover:shadow-gold"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-gold-subtle rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-3 text-foreground">Club World</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                For players, trainers, staff, members, parents, and administrators. Manage your club from the inside.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Players", "Trainers", "Staff", "Members", "Parents", "Admins"].map((role) => (
                  <span key={role} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {role}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                Enter Club World <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Partner World */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate("/onboarding?world=partner")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-10 hover:border-accent/40 transition-all duration-500 hover:shadow-[0_0_30px_hsl(0_65%_50%/0.15)]"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-3 text-foreground">Partner World</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                For sponsors, suppliers, service providers, and consultants. Collaborate and grow together.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Sponsors", "Suppliers", "Consultants", "Services"].map((role) => (
                  <span key={role} className="text-xs px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {role}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-accent font-medium group-hover:gap-3 gap-2 transition-all">
                Enter Partner World <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DualWorldSection;
