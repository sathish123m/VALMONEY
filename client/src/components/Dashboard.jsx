import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, LogOut, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GlassCard = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass-panel rounded-xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

export default function Dashboard({ token, logout }) {
  const [strategy, setStrategy] = useState("avalanche");
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: "",
    balance: "",
    interestRate: "",
    minPayment: "",
  });

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debts/strategy`,
        {
          headers: { "auth-token": token },
        }
      );

      if (res.status === 400 || res.status === 401) logout();
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/api/debts/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "auth-token": token,
      },
      body: JSON.stringify(newDebt),
    });

    setShowForm(false);
    setNewDebt({ name: "", balance: "", interestRate: "", minPayment: "" });
    fetchData();
  };

  if (!data)
    return (
      <div className="h-screen bg-black flex items-center justify-center text-neon-cyan">
        LOADING SECURE DATA...
      </div>
    );

  // Handle case where user has no debts yet
  if (!data.avalanche || !data.avalanche.timeline) {
    return (
      <div className="min-h-screen bg-god-gradient flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to VALMONEY</h1>
        <p className="text-gray-400 mb-8">
          You have no debts recorded. Add one to generate your god-mode plan.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-neon-cyan text-black px-6 py-3 rounded font-bold"
        >
          Add Your First Debt
        </button>

        {showForm && (
          <form
            onSubmit={handleAdd}
            className="mt-6 space-y-3 w-full max-w-sm glass-panel p-6 rounded"
          >
            <input
              placeholder="Debt Name"
              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white"
              value={newDebt.name}
              onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Balance"
              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white"
              value={newDebt.balance}
              onChange={(e) =>
                setNewDebt({ ...newDebt, balance: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Rate %"
              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white"
              value={newDebt.interestRate}
              onChange={(e) =>
                setNewDebt({ ...newDebt, interestRate: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Min Payment"
              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white"
              value={newDebt.minPayment}
              onChange={(e) =>
                setNewDebt({ ...newDebt, minPayment: e.target.value })
              }
              required
            />
            <button
              type="submit"
              className="w-full bg-neon-cyan text-black font-bold py-2 rounded text-sm mt-2"
            >
              SAVE
            </button>
          </form>
        )}
        <button
          onClick={logout}
          className="mt-8 text-gray-500 text-sm hover:text-white"
        >
          Log Out
        </button>
      </div>
    );
  }

  const currentData = data[strategy];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black neon-text">
          VALMONEY{" "}
          <span className="text-xs font-normal text-gray-400 align-middle ml-2">
            ENTERPRISE
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              setStrategy(strategy === "avalanche" ? "snowball" : "avalanche")
            }
            className="text-sm text-neon-cyan border border-neon-cyan/30 px-3 py-1 rounded hover:bg-neon-cyan/10 uppercase"
          >
            {strategy}
          </button>
          <button onClick={logout} className="text-gray-500 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="h-[450px]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="text-neon-cyan" /> Payoff Projection
            </h2>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={currentData.timeline}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00f3ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#333" tick={{ fontSize: 10 }} />
                <YAxis stroke="#333" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#000",
                    border: "1px solid #333",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#00f3ff"
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Your Debts</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="text-neon-cyan"
              >
                <Plus size={20} />
              </button>
            </div>
            {showForm && (
              <form
                onSubmit={handleAdd}
                className="mb-4 space-y-2 pb-4 border-b border-white/10"
              >
                <input
                  placeholder="Name"
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                  value={newDebt.name}
                  onChange={(e) =>
                    setNewDebt({ ...newDebt, name: e.target.value })
                  }
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Bal"
                    className="w-1/2 bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                    value={newDebt.balance}
                    onChange={(e) =>
                      setNewDebt({ ...newDebt, balance: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    className="w-1/2 bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                    value={newDebt.interestRate}
                    onChange={(e) =>
                      setNewDebt({ ...newDebt, interestRate: e.target.value })
                    }
                    required
                  />
                </div>
                <input
                  type="number"
                  placeholder="Min Pay"
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                  value={newDebt.minPayment}
                  onChange={(e) =>
                    setNewDebt({ ...newDebt, minPayment: e.target.value })
                  }
                  required
                />
                <button className="w-full bg-neon-cyan text-black text-xs font-bold py-2 rounded">
                  ADD
                </button>
              </form>
            )}
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.debts.map((d) => (
                <div
                  key={d._id}
                  className="bg-white/5 p-3 rounded flex justify-between"
                >
                  <div>
                    <p className="font-bold text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">
                      {d.interestRate}% APR
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">${d.balance}</p>
                    <p className="text-xs text-gray-400">
                      Min: ${d.minPayment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
