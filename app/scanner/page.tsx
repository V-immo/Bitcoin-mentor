import AssetScanner from "@/components/AssetScanner";
import CommunitySentiment from "@/components/CommunitySentiment";

export default function ScannerPage() {
  return (
    <>
      <AssetScanner />
      <div className="page-container page-full" style={{ paddingTop: 0, paddingBottom: 32 }}>
        <CommunitySentiment />
      </div>
    </>
  );
}
