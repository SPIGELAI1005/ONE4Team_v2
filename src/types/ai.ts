export interface AIMatchAnalysisEvent {
  type: string;
  minute: number | null;
  player: string | null;
}

export interface AIMatchAnalysisData {
  opponent: string;
  is_home: boolean;
  date: string;
  home_score: number | null;
  away_score: number | null;
  events: AIMatchAnalysisEvent[];
}

export interface AIStatsSummary {
  totalMatches: number;
  matches: Array<{
    opponent: string;
    date: string;
    home_score: number | null;
    away_score: number | null;
    is_home: boolean;
  }>;
  events: Array<{
    type: string;
    player: string;
    minute: number | null;
  }>;
}
