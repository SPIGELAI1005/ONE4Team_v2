export function estimateInactiveClubs(totalClubs: number, activeInWindow: number): number {
  return Math.max(totalClubs - activeInWindow, 0);
}
