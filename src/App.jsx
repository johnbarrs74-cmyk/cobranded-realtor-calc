import { BrowserRouter, Routes, Route, useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shield, Home, AlertCircle } from "lucide-react";
import Calculator from "./Calculator.jsx";

// ============================================================
// LOAN OFFICER CONFIG (this is John's info — same for every co-branded calculator)
// ============================================================
const LOAN_OFFICER = {
  name: "John Barrs",
  title: "Senior Loan Officer · Branch Manager",
  company: "Intercoastal Mortgage, LLC",
  nmls: "NMLS #2544471",
  companyNmls: "Company NMLS #56323",
  phone: "757-232-1938",
  phoneRaw: "7572321938",
  intakeFormUrl: "https://icmortgage.icmtg.com/dr/c/24m5r",
  tagline: "Navy SEAL Veteran · Retired Deputy Fire Chief",
  photoUrl: "/john-headshot.jpg",
};

// ============================================================
// DEFAULT REALTOR (used when visiting the bare cobranded-realtor-calc.vercel.app/)
// ============================================================
const DEFAULT_REALTOR = {
  name: "Sarah Jones",
  title: "REALTOR®",
  brokerage: "Keller Williams Realty - Nashville",
  licenseNumber: "TN License #000000",
  phone: "615-555-0100",
  phoneRaw: "6155550100",
  email: "sarah@example.com",
  photoUrl: "",
  tagline: "Your Trusted Middle Tennessee Realtor",
};

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-blue-200">Loading calculator…</p>
      </div>
    </div>
  );
}

function NotFoundScreen({ slug }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-blue-700" />
      <div className="max-w-lg w-full text-center bg-slate-900/70 backdrop-blur-sm border border-blue-900/50 rounded-2xl p-8 shadow-2xl">
        <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-black mb-3">Realtor not found</h1>
        <p className="text-blue-200 mb-6">
          We could not find a partner realtor at <code className="text-yellow-300">/{slug}</code>.
          The link may be wrong, or the partner has not been onboarded yet.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="bg-blue-800 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl">
            View example calculator
          </Link>
          <a href="https://realtor-partner-form.vercel.app" className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 px-5 rounded-xl">
            Become a partner
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Questions? Call John directly: <a className="text-yellow-400" href="tel:7572321938">757-232-1938</a>
        </p>
      </div>
    </div>
  );
}

function DefaultPage() {
  return <Calculator realtor={DEFAULT_REALTOR} loanOfficer={LOAN_OFFICER} />;
}

function RealtorPage() {
  const { slug } = useParams();
  const [realtor, setRealtor] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | not_found | error

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/realtor?slug=${encodeURIComponent(slug)}`)
      .then(async r => {
        if (cancelled) return;
        if (r.status === 404) { setStatus("not_found"); return; }
        if (!r.ok) { setStatus("error"); return; }
        const data = await r.json();
        setRealtor(data);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [slug]);

  if (status === "loading") return <LoadingScreen />;
  if (status === "not_found" || status === "error") return <NotFoundScreen slug={slug} />;
  return <Calculator realtor={realtor} loanOfficer={LOAN_OFFICER} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DefaultPage />} />
        <Route path="/:slug" element={<RealtorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
