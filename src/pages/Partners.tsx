import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Building2, Search, Mail, Phone, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";

type PartnerRow = {
  id: string;
  club_id: string;
  name: string;
  partner_type: string;
  notes: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default function Partners() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const { toast } = useToast();

  const canManage = perms.isTrainer;

  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [q, setQ] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState("sponsor");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("id, club_id, name, partner_type, notes, website, email, phone, created_at")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setPartners((data as unknown as PartnerRow[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load partners";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return partners;
    return partners.filter((p) =>
      [p.name, p.partner_type, p.website ?? "", p.email ?? "", p.phone ?? "", p.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [partners, q]);

  const createPartner = async () => {
    if (!clubId || !user || !canManage) return;
    if (!name.trim()) return;

    const { error } = await supabase.from("partners").insert({
      club_id: clubId,
      name: name.trim(),
      partner_type: partnerType,
      website: website.trim() ? website.trim() : null,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Partner created" });
    setShowCreate(false);
    setName("");
    setPartnerType("sponsor");
    setWebsite("");
    setEmail("");
    setPhone("");
    setNotes("");
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Partners"
        subtitle="Contacts (stub)"
        rightSlot={
          canManage ? (
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={() => setShowCreate(true)}
              disabled={!clubId}
            >
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          ) : null
        }
      />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Select a club to view partners.</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No partners yet</h2>
            <p className="text-muted-foreground">Add sponsors and suppliers as contact cards.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners…" />
              </div>
            </div>

            <div className="grid gap-3">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">
                          {p.partner_type.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-1 font-display font-bold text-foreground truncate">{p.name}</div>

                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        {p.website && (
                          <a className="inline-flex items-center gap-1 hover:text-foreground" href={p.website} target="_blank" rel="noreferrer">
                            <Link2 className="w-3.5 h-3.5" /> {p.website}
                          </a>
                        )}
                        {p.email && (
                          <a className="inline-flex items-center gap-1 hover:text-foreground" href={`mailto:${p.email}`}>
                            <Mail className="w-3.5 h-3.5" /> {p.email}
                          </a>
                        )}
                        {p.phone && (
                          <a className="inline-flex items-center gap-1 hover:text-foreground" href={`tel:${p.phone}`}>
                            <Phone className="w-3.5 h-3.5" /> {p.phone}
                          </a>
                        )}
                      </div>

                      {p.notes && <div className="mt-2 text-xs text-muted-foreground">{p.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">New partner</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ACME Sponsor" />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Type</div>
                <select
                  className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}
                >
                  <option value="sponsor">Sponsor</option>
                  <option value="supplier">Supplier</option>
                  <option value="service_provider">Service provider</option>
                  <option value="consultant">Consultant</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Website</div>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@…" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Phone</div>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Notes</div>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold" onClick={createPartner}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
