import { useState, useEffect, useMemo } from "react";
import { Shield, Phone, MessageSquare, FileText, Home, TrendingDown, Star, Award, User, Mail } from "lucide-react";

export default function Calculator({ realtor, loanOfficer }) {
  // Loan inputs
  const [loanType, setLoanType] = useState("VA");
  const [homePrice, setHomePrice] = useState(385000);
  const [downPayment, setDownPayment] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [interestRate, setInterestRate] = useState(6.02);
  const [propertyTaxRate, setPropertyTaxRate] = useState(0.65);
  const [insurance, setInsurance] = useState(1400);
  const [hoaDues, setHoaDues] = useState(0);
  const [animatedPayment, setAnimatedPayment] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showRateAdmin, setShowRateAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

  const [rates, setRates] = useState({
    VA: { 30: 6.02, 15: 5.72 },
    FHA: { 30: 6.10, 15: 5.80 },
    Conventional: { 30: 6.35, 15: 6.03 },
  });

  const updateRate = (type, term, value) => {
    setRates(prev => ({ ...prev, [type]: { ...prev[type], [term]: Number(value) } }));
    setLastUpdated(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  };

  useEffect(() => { setInterestRate(rates[loanType][loanTerm]); }, [loanType, loanTerm, rates]);
  useEffect(() => {
    if (homePrice > 0) setDownPaymentPercent(((downPayment / homePrice) * 100).toFixed(1));
  }, [downPayment, homePrice]);

  const calculations = useMemo(() => {
    const loanAmount = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const vaFundingFee = loanType === "VA" ? loanAmount * 0.0215 : 0;
    const fhaUFMIP = loanType === "FHA" ? loanAmount * 0.0175 : 0;
    const totalFinanced = loanAmount + vaFundingFee + fhaUFMIP;
    const monthlyPI = monthlyRate > 0
      ? (totalFinanced * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
    const monthlyTax = (homePrice * (propertyTaxRate / 100)) / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyPMI = (loanType === "Conventional" && downPayment / homePrice < 0.2) ? (loanAmount * 0.005) / 12 : 0;
    const monthlyMIP = loanType === "FHA" ? (loanAmount * 0.0055) / 12 : 0;
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI + monthlyMIP + Number(hoaDues);
    const totalInterest = (monthlyPI * numPayments) - totalFinanced;
    return { loanAmount, totalFinanced, vaFundingFee, fhaUFMIP, monthlyPI, monthlyTax, monthlyInsurance, monthlyPMI, monthlyMIP, totalMonthly, totalInterest };
  }, [homePrice, downPayment, loanTerm, interestRate, propertyTaxRate, insurance, hoaDues, loanType]);

  useEffect(() => {
    const target = calculations.totalMonthly;
    const duration = 600;
    const steps = 30;
    const stepValue = (target - animatedPayment) / steps;
    let current = animatedPayment;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      current += stepValue;
      setAnimatedPayment(current);
      if (count >= steps) { setAnimatedPayment(target); clearInterval(interval); }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [calculations.totalMonthly]);

  const formatCurrency = (n) => "$" + Math.round(n).toLocaleString("en-US");

  const pieData = [
    { label: "Principal & Interest", value: calculations.monthlyPI, color: "#1e3a8a" },
    { label: "Property Tax", value: calculations.monthlyTax, color: "#b91c1c" },
    { label: "Homeowners Insurance", value: calculations.monthlyInsurance, color: "#ca8a04" },
    { label: loanType === "Conventional" ? "PMI" : loanType === "FHA" ? "MIP" : "VA Fee (financed)", value: calculations.monthlyPMI + calculations.monthlyMIP, color: "#475569" },
    { label: "HOA", value: Number(hoaDues), color: "#64748b" },
  ].filter(d => d.value > 0);

  const total = pieData.reduce((sum, d) => sum + d.value, 0);
  let cumulativeAngle = -90;
  const slices = pieData.map(d => {
    const percentage = (d.value / total) * 100;
    const angle = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;
    const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
    const largeArc = angle > 180 ? 1 : 0;
    return { ...d, percentage, path: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  // Realtor initials for placeholder avatar
  const realtorInitials = realtor.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white opacity-20 animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + "px", height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%", left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s", animationDuration: Math.random() * 3 + 2 + "s",
            }} />
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-blue-700" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* CO-BRANDED HEADER */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-blue-900/50 rounded-2xl p-5 sm:p-6 mb-8 shadow-2xl animate-fadeIn">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 items-center">
            {/* realtor SIDE */}
            <div className="flex items-center gap-4">
              {realtor.photoUrl ? (
                <img src={realtor.photoUrl} alt={realtor.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 border-4 border-yellow-400 shadow-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-white">{realtorInitials}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-0.5">Your Realtor</p>
                <h2 className="text-lg sm:text-xl font-black text-white truncate">{realtor.name}</h2>
                <p className="text-xs text-blue-200">{realtor.title}</p>
                <p className="text-xs text-slate-300 truncate">{realtor.brokerage}</p>
                <a href={`tel:${realtor.phoneRaw}`} className="text-xs text-yellow-300 hover:text-yellow-100 font-semibold">
                  📞 {realtor.phone}
                </a>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="hidden sm:block absolute left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-yellow-500/40 to-transparent" />

            {/* LOAN OFFICER SIDE */}
            <div className="flex items-center gap-4 sm:border-l sm:border-yellow-500/20 sm:pl-6">
              {loanOfficer.photoUrl ? (
                <img src={loanOfficer.photoUrl} alt={loanOfficer.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-600 to-red-900 border-4 border-yellow-400 shadow-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-0.5">Your Loan Officer</p>
                <h2 className="text-lg sm:text-xl font-black text-white truncate">{loanOfficer.name}</h2>
                <p className="text-xs text-blue-200">{loanOfficer.title}</p>
                <p className="text-xs text-slate-300 truncate">{loanOfficer.company}</p>
                <a href={`tel:${loanOfficer.phoneRaw}`} className="text-xs text-yellow-300 hover:text-yellow-100 font-semibold">
                  📞 {loanOfficer.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Partnership banner */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
            <p className="text-xs text-blue-200 italic">
              Working together to get you home — <span className="text-yellow-400 font-semibold">7 days a week</span>
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.15] pb-2 mb-2 bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
            Mortgage Calculator
          </h1>
          <p className="text-blue-200 text-sm sm:text-base">
            See your real numbers in seconds — built for Tennessee buyers
          </p>
        </div>

        {/* Rate Admin */}
        <div className="max-w-3xl mx-auto mb-6">
          <button onClick={() => setShowRateAdmin(!showRateAdmin)}
            className="w-full flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 border border-yellow-700/40 rounded-xl px-4 py-3 transition-all group">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-300">Today's Rates</span>
              <span className="text-xs text-slate-400">· Updated {lastUpdated}</span>
            </div>
            <span className="text-xs text-yellow-500 group-hover:text-yellow-300">
              {showRateAdmin ? "▲ Close" : "▼ Update Rates"}
            </span>
          </button>

          {showRateAdmin && (
            <div className="mt-2 bg-slate-900/80 backdrop-blur-sm border border-yellow-700/30 rounded-xl p-5 animate-fadeIn">
              <p className="text-xs text-slate-400 mb-4 italic">Loan officer admin: rates update live across the calculator.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {["VA", "FHA", "Conventional"].map((type) => (
                  <div key={type} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs font-bold text-blue-300 uppercase mb-2">{type}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">30-yr Fixed (%)</label>
                        <input type="number" step="0.01" value={rates[type][30]}
                          onChange={(e) => updateRate(type, 30, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-yellow-300 font-bold focus:border-yellow-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">15-yr Fixed (%)</label>
                        <input type="number" step="0.01" value={rates[type][15]}
                          onChange={(e) => updateRate(type, 15, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-yellow-300 font-bold focus:border-yellow-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loan Type Selector */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
          {["VA", "FHA", "Conventional"].map((type) => (
            <button key={type} onClick={() => setLoanType(type)}
              className={`relative px-5 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
                loanType === type ? "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-900/50" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-blue-500"
              }`}>
              {type === "VA" && (
                <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm shadow-sm flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="16" fill="#B22234"/>
                  <rect y="1.23" width="24" height="1.23" fill="white"/>
                  <rect y="3.69" width="24" height="1.23" fill="white"/>
                  <rect y="6.15" width="24" height="1.23" fill="white"/>
                  <rect y="8.62" width="24" height="1.23" fill="white"/>
                  <rect y="11.08" width="24" height="1.23" fill="white"/>
                  <rect y="13.54" width="24" height="1.23" fill="white"/>
                  <rect width="9.6" height="8.62" fill="#3C3B6E"/>
                  <g fill="white">
                    <circle cx="1.2" cy="1.4" r="0.3"/><circle cx="3" cy="1.4" r="0.3"/><circle cx="4.8" cy="1.4" r="0.3"/><circle cx="6.6" cy="1.4" r="0.3"/><circle cx="8.4" cy="1.4" r="0.3"/>
                    <circle cx="2.1" cy="2.6" r="0.3"/><circle cx="3.9" cy="2.6" r="0.3"/><circle cx="5.7" cy="2.6" r="0.3"/><circle cx="7.5" cy="2.6" r="0.3"/>
                    <circle cx="1.2" cy="3.8" r="0.3"/><circle cx="3" cy="3.8" r="0.3"/><circle cx="4.8" cy="3.8" r="0.3"/><circle cx="6.6" cy="3.8" r="0.3"/><circle cx="8.4" cy="3.8" r="0.3"/>
                    <circle cx="2.1" cy="5" r="0.3"/><circle cx="3.9" cy="5" r="0.3"/><circle cx="5.7" cy="5" r="0.3"/><circle cx="7.5" cy="5" r="0.3"/>
                    <circle cx="1.2" cy="6.2" r="0.3"/><circle cx="3" cy="6.2" r="0.3"/><circle cx="4.8" cy="6.2" r="0.3"/><circle cx="6.6" cy="6.2" r="0.3"/><circle cx="8.4" cy="6.2" r="0.3"/>
                    <circle cx="2.1" cy="7.4" r="0.3"/><circle cx="3.9" cy="7.4" r="0.3"/><circle cx="5.7" cy="7.4" r="0.3"/><circle cx="7.5" cy="7.4" r="0.3"/>
                  </g>
                </svg>
              )}
              {type} Loan
              {loanType === type && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Inputs */}
          <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-blue-900/50 p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-400" /><span>Loan Details</span>
            </h2>

            <div className="mb-6">
              <label className="flex justify-between text-sm font-semibold text-blue-200 mb-2">
                <span>Home Price</span>
                <span className="text-yellow-400 font-bold">{formatCurrency(homePrice)}</span>
              </label>
              <input type="range" min="50000" max="1500000" step="5000" value={homePrice}
                onChange={(e) => setHomePrice(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <input type="number" value={homePrice} onChange={(e) => setHomePrice(Number(e.target.value))}
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="mb-6">
              <label className="flex justify-between text-sm font-semibold text-blue-200 mb-2">
                <span>Down Payment</span>
                <span className="text-yellow-400 font-bold">{formatCurrency(downPayment)} ({downPaymentPercent}%)</span>
              </label>
              <input type="range" min="0" max={homePrice * 0.5} step="1000" value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              {loanType === "VA" && downPayment === 0 && (
                <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                  <Star className="w-3 h-3" /> $0 Down — VA Loan Benefit
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-blue-200 mb-2 block">Loan Term</label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 15].map((term) => (
                  <button key={term} onClick={() => setLoanTerm(term)}
                    className={`py-2.5 rounded-lg font-bold transition-all ${
                      loanTerm === term ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-500"
                    }`}>{term} Years</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="flex justify-between text-sm font-semibold text-blue-200 mb-2">
                <span>Interest Rate</span>
                <span className="text-yellow-400 font-bold">{interestRate}%</span>
              </label>
              <input type="range" min="3" max="10" step="0.01" value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <p className="text-xs text-slate-400 mt-1">Today's avg {loanType} {loanTerm}-yr fixed</p>
            </div>

            <button onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline">
              {showBreakdown ? "▲ Hide" : "▼ Show"} Tax, Insurance & HOA
            </button>

            {showBreakdown && (
              <div className="mt-4 space-y-4 animate-fadeIn">
                <div>
                  <label className="flex justify-between text-sm font-semibold text-blue-200 mb-2">
                    <span>Property Tax Rate</span>
                    <span className="text-yellow-400 font-bold">{propertyTaxRate}%</span>
                  </label>
                  <input type="range" min="0" max="3" step="0.05" value={propertyTaxRate}
                    onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-blue-200 mb-2 block">Annual Homeowners Insurance</label>
                  <input type="number" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-blue-200 mb-2 block">Monthly HOA Dues</label>
                  <input type="number" value={hoaDues} onChange={(e) => setHoaDues(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Results */}
          <div className="bg-gradient-to-br from-blue-950 to-slate-900 rounded-2xl border border-blue-700/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <Shield className="absolute -right-10 -top-10 w-64 h-64 text-blue-800/10" />
            <div className="relative">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">Your Estimated Monthly Payment</p>
              <div className="text-5xl sm:text-6xl font-black mb-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                {formatCurrency(animatedPayment)}
              </div>
              <p className="text-blue-200 text-sm">/ month total PITI</p>

              <div className="my-8 flex flex-col sm:flex-row items-center gap-6">
                <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-2xl">
                  {slices.map((slice, i) => (
                    <path key={i} d={slice.path} fill={slice.color} stroke="#0f172a" strokeWidth="2"
                      className="transition-all duration-500 hover:opacity-80" />
                  ))}
                  <circle cx="100" cy="100" r="38" fill="#0f172a" />
                  <text x="100" y="95" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">Monthly</text>
                  <text x="100" y="110" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">Breakdown</text>
                </svg>
                <div className="flex-1 space-y-2 w-full">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                        <span className="text-blue-100">{d.label}</span>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase">Loan Amount</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(calculations.loanAmount)}</p>
                </div>
                <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase">Total Interest</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(calculations.totalInterest)}</p>
                </div>
              </div>

              {loanType === "VA" && (
                <div className="bg-gradient-to-r from-red-900/50 to-blue-900/50 border border-red-500/30 rounded-xl p-4 mb-6 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-yellow-400">VA Loan Benefits Active</h3>
                  </div>
                  <ul className="text-xs sm:text-sm text-blue-100 space-y-1">
                    <li>✓ $0 down payment required</li>
                    <li>✓ No PMI (saves ~${Math.round(calculations.loanAmount * 0.005 / 12)}/mo)</li>
                    <li>✓ Funding fee can be waived for disabled veterans</li>
                    <li>✓ Lower rates than conventional loans</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DUAL CTA SECTION */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          {/* Realtor CTA */}
          <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border-2 border-yellow-500/30 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-yellow-400" />
              <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold">Ready to find your home?</p>
            </div>
            <h3 className="text-lg font-bold mb-3">Connect with {realtor.name.split(" ")[0]}</h3>
            <div className={`grid gap-2 ${realtor.email && realtor.email.includes("@") ? "grid-cols-3" : "grid-cols-2"}`}>
              <a href={`tel:${realtor.phoneRaw}`}
                className="bg-blue-800 hover:bg-blue-700 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 text-sm transition-all transform hover:scale-105">
                <Phone className="w-4 h-4" /> Call
              </a>
              <a href={`sms:${realtor.phoneRaw}`}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 text-sm border border-slate-600 transition-all transform hover:scale-105">
                <MessageSquare className="w-4 h-4" /> Text
              </a>
              {realtor.email && realtor.email.includes("@") && (
                <a href={`mailto:${realtor.email}`}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 text-sm transition-all transform hover:scale-105">
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
            </div>
          </div>

          {/* Loan Officer CTA — primary action */}
          <div className="bg-gradient-to-br from-red-900/40 to-slate-900 rounded-2xl border-2 border-red-500/40 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-red-400" />
              <p className="text-xs uppercase tracking-wider text-red-300 font-bold">Get pre-approved fast</p>
            </div>
            <h3 className="text-lg font-bold mb-3">Apply with {loanOfficer.name.split(" ")[0]}</h3>
            <a href={loanOfficer.intakeFormUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-900/50 transition-all transform hover:scale-105">
              <FileText className="w-4 h-4" /> Start My Application
            </a>
          </div>
        </div>

        {/* Compliance footer */}
        <div className="mt-10 text-xs text-slate-400 text-center space-y-2 leading-relaxed border-t border-slate-800 pt-6">
          <p className="font-semibold text-slate-300">
            Real Estate: {realtor.name} · {realtor.licenseNumber} · {realtor.brokerage}
          </p>
          <p className="font-semibold text-slate-300">
            Mortgage: {loanOfficer.name} · {loanOfficer.company} · {loanOfficer.nmls} · {loanOfficer.companyNmls} · Licensed in TN, KY, FL, NC, and VA
          </p>
          <p className="max-w-3xl mx-auto pt-2">
            This calculator provides estimates only and is not a commitment to lend or a guarantee of any specific rate, fee, or term. Actual loan terms depend on credit, income, property type, and other underwriting factors. Rates shown reflect today's market averages and are subject to change without notice.
          </p>
          <p className="pt-2 flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /><span>Equal Housing Opportunity</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 20px; height: 20px;
          background: linear-gradient(135deg, #dc2626, #991b1b);
          border-radius: 50%; cursor: pointer; border: 2px solid white;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.5); transition: transform 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        input[type="range"]::-moz-range-thumb {
          width: 20px; height: 20px;
          background: linear-gradient(135deg, #dc2626, #991b1b);
          border-radius: 50%; cursor: pointer; border: 2px solid white;
        }
      `}</style>
    </div>
  );
}