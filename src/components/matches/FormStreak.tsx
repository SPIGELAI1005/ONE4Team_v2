import { motion } from "framer-motion";

type MatchResult = { status: string; home_score: number | null; away_score: number | null; is_home: boolean };

interface FormStreakProps {
  matches: MatchResult[];
  count?: number;
}

const FormStreak = ({ matches, count = 5 }: FormStreakProps) => {
  const completed = matches
    .filter(m => m.status === "completed")
    .slice(0, count);

  if (completed.length === 0) return null;

  const getResult = (m: MatchResult) => {
    const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
    const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
    if (gf > ga) return "W";
    if (gf === ga) return "D";
    return "L";
  };

  const colors: Record<string, string> = {
    W: "bg-primary text-primary-foreground",
    D: "bg-muted text-muted-foreground",
    L: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1">Form:</span>
      {completed.map((m, i) => {
        const r = getResult(m);
        return (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${colors[r]}`}>
            {r}
          </motion.span>
        );
      })}
    </div>
  );
};

export default FormStreak;
