import { useRef, useState } from "react";
import { Download, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";

type LineupPlayer = {
  id: string;
  membership_id: string;
  is_starter: boolean;
  jersey_number: number | null;
  position: string | null;
};

type Props = {
  matchTitle: string;
  matchDate: string;
  location?: string | null;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
  getMemberName: (membershipId: string) => string;
};

const LineupExport = ({ matchTitle, matchDate, location, starters, substitutes, getMemberName }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      // Temporarily show the hidden export card
      ref.current.style.position = "fixed";
      ref.current.style.left = "-9999px";
      ref.current.style.display = "block";

      const canvas = await html2canvas(ref.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
      });

      ref.current.style.display = "none";

      const link = document.createElement("a");
      link.download = `lineup-${matchTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (starters.length === 0 && substitutes.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
        className="gap-1.5"
      >
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Export Lineup
      </Button>

      {/* Hidden render target for export */}
      <div ref={ref} style={{ display: "none", width: 600 }}>
        <div style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          padding: 32,
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
          borderRadius: 16,
        }}>
          {/* Header */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{matchTitle}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {new Date(matchDate).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {location ? ` · ${location}` : ""}
            </div>
          </div>

          {/* Starting XI */}
          {starters.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                Starting XI
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {starters.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.08)", flex: "0 0 calc(50% - 3px)",
                  }}>
                    {p.jersey_number != null && (
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "rgba(212,175,55,0.2)", color: "#d4af37",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800,
                      }}>{p.jersey_number}</div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{getMemberName(p.membership_id)}</div>
                      {p.position && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{p.position}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Substitutes */}
          {substitutes.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                Substitutes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {substitutes.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.05)", flex: "0 0 calc(50% - 3px)",
                  }}>
                    {p.jersey_number != null && (
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                      }}>{p.jersey_number}</div>
                    )}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{getMemberName(p.membership_id)}</div>
                      {p.position && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.position}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>MATCH LINEUP</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LineupExport;
