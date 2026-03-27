import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", label: "Inference" },
  { path: "/architecture", label: "Architecture" },
  { path: "/evaluation", label: "Evaluation" },
  { path: "/model-card", label: "Model Card" },
] as const;

export default function Navbar() {
  const location = useLocation();
  return (
    <nav className="flex items-center justify-between border-b border-[#e8dcc8] bg-white/95 px-6 py-0 backdrop-blur">
      <Link to="/" className="h-[95px] shrink-0 no-underline" aria-label="Sherlock home">
        <img
          src="/logo.png"
          alt="Sherlock logo"
          className="h-[95px] w-auto object-contain"
        />
      </Link>
      <div className="flex items-center gap-1 rounded-full border border-[#eadfcf] bg-[#fffaf2] p-1">
        {navItems.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={
              location.pathname === path
                ? "rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-slate-900 shadow-sm"
                : "rounded-full px-3 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900"
            }
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
