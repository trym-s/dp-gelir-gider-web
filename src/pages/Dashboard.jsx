import ChartGelirGider from "../components/ChartGelirGider";
import SonIslemler from "../components/SonIslemler";

export default function Dashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "20px",
        alignItems: "start"
      }}
    >
      <ChartGelirGider />
      <SonIslemler />
    </div>
  );
}
