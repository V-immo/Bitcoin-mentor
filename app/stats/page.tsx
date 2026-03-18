import StatsPanel from "@/components/StatsPanel";
import GoalTracker from "@/components/GoalTracker";
import Leaderboard from "@/components/Leaderboard";

export default function StatsPage() {
  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">Statistieken</h1>
        <p className="stats-subtitle">Je papier-trading voortgang en prestaties</p>
      </div>

      <div className="stats-grid">
        <GoalTracker />
        <StatsPanel />
      </div>

      <div style={{ marginTop: 24 }}>
        <Leaderboard />
      </div>
    </div>
  );
}
