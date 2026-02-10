import { motion } from "framer-motion";
import {
  Users, Calendar, Trophy, CreditCard, MessageSquare,
  Briefcase, ShoppingBag, Bot, BarChart3, Globe
} from "lucide-react";

const features = [
  { icon: Users, title: "Member Management", desc: "Profiles, roles, family links, certifications — everything organized." },
  { icon: Calendar, title: "Training & Teams", desc: "Planning, attendance tracking, field assignments, and session history." },
  { icon: Trophy, title: "Match Management", desc: "Scheduling, line-ups, results, statistics, and player availability." },
  { icon: CreditCard, title: "Payments & Fees", desc: "Membership fees, invoices, payment tracking, and financial overview." },
  { icon: MessageSquare, title: "Communication", desc: "Announcements, team chats, event notifications — stay connected." },
  { icon: Briefcase, title: "Partner Portal", desc: "Manage sponsors, suppliers, contracts, and cooperation history." },
  { icon: ShoppingBag, title: "Club Shop", desc: "Merchandise, kits, fan articles with order management." },
  { icon: Globe, title: "Public Club Page", desc: "Branded website with teams, schedules, events, and contact." },
  { icon: Bot, title: "AI Co-Trainer", desc: "Training suggestions, squad planning, and workload analysis." },
  { icon: BarChart3, title: "Smart Dashboards", desc: "Role-specific KPIs, insights, and AI-powered recommendations." },
];

const FeaturesSection = () => {
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
            Everything your club needs.{" "}
            <span className="text-gradient-gold">One platform.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From member management to AI-assisted coaching — ONE4Team covers every aspect of modern club operations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-gold"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-gold-subtle flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1 text-sm">{feature.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
