import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Inference from "./pages/Inference";
import Evaluation from "./pages/Evaluation";
import ModelCard from "./pages/ModelCard";
import Architecture from "./pages/Architecture";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Inference />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/model-card" element={<ModelCard />} />
          <Route path="/architecture" element={<Architecture />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
