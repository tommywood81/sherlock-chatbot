import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Inference from "./pages/Inference";
import Evaluation from "./pages/Evaluation";
import ModelCard from "./pages/ModelCard";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Inference />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/model-card" element={<ModelCard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
