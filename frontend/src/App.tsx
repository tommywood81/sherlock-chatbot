import { Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import Evaluation from "./pages/Evaluation";
import ModelCard from "./pages/ModelCard";

function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">Sherlock</Link>
        <nav>
          <Link to="/">Chat</Link>
          <Link to="/evaluation">Evaluation</Link>
          <Link to="/model-card">Model Card</Link>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/model-card" element={<ModelCard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
