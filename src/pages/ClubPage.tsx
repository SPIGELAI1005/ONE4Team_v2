import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, Trophy, MapPin, Phone, Mail,
  Clock, ArrowRight, ChevronRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const teams = [
  { name: "First Team", sport: "Football", players: 22, coach: "John Miller" },
  { name: "U19 Youth", sport: "Football", players: 18, coach: "Sarah Chen" },
  { name: "U17 Development", sport: "Football", players: 20, coach: "Marco Ruiz" },
  { name: "Women's Team", sport: "Football", players: 16, coach: "Lisa Park" },
];

const schedule = [
  { day: "Monday", time: "18:00 – 19:30", team: "U17 Development", location: "Field A" },
  { day: "Tuesday", time: "18:30 – 20:00", team: "First Team", location: "Main Stadium" },
  { day: "Wednesday", time: "17:00 – 18:30", team: "U19 Youth", location: "Field B" },
  { day: "Thursday", time: "18:00 – 19:30", team: "Women's Team", location: "Field A" },
  { day: "Friday", time: "18:30 – 20:00", team: "First Team", location: "Main Stadium" },
];

const events = [
  { title: "Summer Tournament 2026", date: "Mar 15, 2026", type: "Tournament", desc: "Annual youth tournament with 16 clubs." },
  { title: "Club Anniversary Gala", date: "Apr 5, 2026", type: "Social", desc: "Celebrating 50 years of community sports." },
  { title: "Open Training Day", date: "Mar 1, 2026", type: "Open Day", desc: "Free trial training for new members." },
  { title: "Sponsors Evening", date: "Mar 20, 2026", type: "Networking", desc: "Meet our partners and sponsors." },
];

const sponsors = [
  { name: "SportTech Pro", tier: "Gold" },
  { name: "City Insurance AG", tier: "Gold" },
  { name: "FreshFit Drinks", tier: "Silver" },
  { name: "Local Print Shop", tier: "Bronze" },
  { name: "GreenField Garden", tier: "Bronze" },
];

const ClubPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-8 h-8" />
            <span className="font-display font-bold text-lg text-foreground">
              FC <span className="text-gradient-gold">Riverside</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#teams" className="hover:text-foreground transition-colors">Teams</a>
            <a href="#schedule" className="hover:text-foreground transition-colors">Schedule</a>
            <a href="#events" className="hover:text-foreground transition-colors">Events</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
          <Button
            size="sm"
            className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
            onClick={() => navigate("/onboarding")}
          >
            Join Club
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6">
              <img src={logo} alt="" className="w-12 h-12" />
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              FC <span className="text-gradient-gold">Riverside</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-2">Est. 1976 · Community Football Club</p>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Building champions and community spirit for over 50 years. Join our family of athletes, supporters, and friends.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size="lg" className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90">
                Become a Member <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-border">
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, label: "247 Members", desc: "Active community across all age groups" },
              { icon: Trophy, label: "8 Teams", desc: "From youth to senior competitive squads" },
              { icon: Star, label: "3 Leagues", desc: "Competing at regional and district level" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl bg-card border border-border"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-display text-xl font-bold text-foreground mb-1">{stat.label}</h3>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section id="teams" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Our <span className="text-gradient-gold">Teams</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{team.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{team.sport}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{team.players} players</span>
                  <span>{team.coach}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Schedule */}
      <section id="schedule" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Training <span className="text-gradient-gold">Schedule</span>
          </h2>
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border overflow-hidden">
            {schedule.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-4 ${i < schedule.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-primary">{s.day}</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.team}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.location}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Upcoming <span className="text-gradient-gold">Events</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {events.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{event.type}</span>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{event.title}</h3>
                <p className="text-xs text-muted-foreground">{event.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Our <span className="text-gradient-gold">Partners</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {sponsors.map((s, i) => (
              <div key={i} className="px-6 py-3 rounded-lg bg-card border border-border text-center">
                <div className="text-sm font-medium text-foreground">{s.name}</div>
                <div className={`text-[10px] font-medium mt-1 ${
                  s.tier === "Gold" ? "text-primary" : s.tier === "Silver" ? "text-muted-foreground" : "text-gold-dark"
                }`}>{s.tier} Partner</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Get in <span className="text-gradient-gold">Touch</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: MapPin, label: "Address", value: "Riverside Sports Park\n12345 Riverside, DE" },
              { icon: Phone, label: "Phone", value: "+49 123 456 789" },
              { icon: Mail, label: "Email", value: "info@fc-riverside.de" },
            ].map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-card border border-border text-center">
                <c.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
                <div className="text-sm text-foreground whitespace-pre-line">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logo} alt="" className="w-6 h-6" />
            <span className="font-display font-bold text-sm text-foreground">
              FC Riverside
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by ONE4Team · © 2026 All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClubPage;
