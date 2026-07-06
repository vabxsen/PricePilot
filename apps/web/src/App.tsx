import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard.js";
import { Landing } from "./pages/Landing.js";
import { Login } from "./pages/Login.js";

function Nav() {
  return (
    <header className="border-b border-black/5 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white">✈</span>
          <span className="text-lg">PricePilot</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/dashboard" className="text-brand hover:underline">
            Dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
      <footer className="border-t border-black/5 px-4 py-6 text-center text-sm text-black/50 dark:border-white/10 dark:text-white/50">
        PricePilot — MVP scaffold (S0). See <code>docs/07-spark-mvp.md</code>.
      </footer>
    </div>
  );
}
