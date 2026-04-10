import AssetScanner from "@/components/AssetScanner";
import MarketOverview from "@/components/MarketOverview";

export default function ScannerPage() {
  return (
    <>
      <AssetScanner />
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 20px 32px" }}>
        <MarketOverview />
      </div>
    </>
  );
}
