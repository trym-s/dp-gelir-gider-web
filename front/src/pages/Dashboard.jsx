import ChartGelirGider from "../components/ChartGelirGider";
import SonIslemler from "../components/SonIslemler";
import ExpensesList from "../components/ExpensesList"; // 1. ExpensesList'i import et


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
     <div>
         <ExpensesList /> {/*  */}
        <ChartGelirGider />
      </div>
      <SonIslemler />
    </div>
  );
}
