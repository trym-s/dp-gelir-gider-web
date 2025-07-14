import ChartGelirGider from "../../components/ChartGelirGider";
import SonIslemler from "../Dashboard/components/SonIslemler";
import "./Home.css";

export default function Home() {
  return (
    <div className="dashboard-container">
      <div className="raporlar-kapsayici">
        <ChartGelirGider />
      </div>
      <div className="sonislemler-kutu">
        <SonIslemler />
      </div>
    </div>
  );
}
