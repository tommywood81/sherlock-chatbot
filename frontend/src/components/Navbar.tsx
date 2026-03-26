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
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2">
      <Link to="/" className="shrink-0 overflow-visible no-underline" aria-label="Sherlock home">
        <img
          src="/logo.png"
          alt="Sherlock logo"
          className="h-20 w-auto origin-left scale-[2] object-contain"
        />
      </Link>
      <div className="flex gap-6">
        {navItems.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={
              location.pathname === path
                ? "font-medium text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
