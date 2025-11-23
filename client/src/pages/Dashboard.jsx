import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-base p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-bg-secondary text-txt-primary">
                <Icon size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-bg-secondary text-txt-secondary">
                LIVE
            </span>
        </div>
        <h3 className="text-txt-secondary text-sm font-medium uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-txt-primary mt-1">{value}</p>
        <p className="text-xs text-txt-secondary mt-2">{subtext}</p>
    </motion.div>
);

const Dashboard = ({ token }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5001/api/debts/strategy', {
                    headers: { 'auth-token': token }
                });
                const json = await res.json();
                setData(json);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    if (loading) return <div className="p-10 text-txt-primary">Syncing Financial Data...</div>;
    if (!data || !data.debts) return <div className="p-10 text-txt-primary">No Data Found.</div>;

    // CALCULATE REAL TOTALS
    const totalDebt = data.debts.reduce((acc, d) => acc + d.balance, 0);
    const totalMinPay = data.debts.reduce((acc, d) => acc + d.minPayment, 0);
    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + data.avalanche.months);

    return (
        <div className="animate-enter">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-txt-primary">Financial Command</h1>
                <p className="text-txt-secondary">Real-time analysis of your debt portfolio.</p>
            </header>

            {/* REAL METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Total Liability" 
                    value={`$${totalDebt.toLocaleString()}`} 
                    subtext={`${data.debts.length} Active Accounts`} 
                    icon={DollarSign} 
                    color="#ef4444" 
                />
                <StatCard 
                    title="Monthly Commit" 
                    value={`$${totalMinPay.toLocaleString()}`} 
                    subtext="Minimum payments due" 
                    icon={Wallet} 
                    color="#f59e0b" 
                />
                <StatCard 
                    title="Debt Free By" 
                    value={debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                    subtext={`${data.avalanche.months} Months remaining`} 
                    icon={Calendar} 
                    color="#10b981" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CHART */}
                <div className="lg:col-span-2 card-base p-6 h-[400px]">
                    <h3 className="text-lg font-bold text-txt-primary mb-6">Avalanche Trajectory</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={data.avalanche.timeline}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} interval="preserveStartEnd" />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                            <Area type="monotone" dataKey="val" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* DEBT LIST */}
                <div className="card-base p-6">
                    <h3 className="text-lg font-bold text-txt-primary mb-4">Active Accounts</h3>
                    <div className="space-y-3 custom-scroll max-h-[300px] overflow-y-auto">
                        {data.debts.map((d) => (
                            <div key={d._id} className="p-4 rounded-xl bg-bg-secondary border border-border flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-txt-primary">{d.name}</p>
                                    <p className="text-xs text-txt-secondary">{d.interestRate}% APR</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-txt-primary">${d.balance.toLocaleString()}</p>
                                    <p className="text-xs text-txt-secondary">Min: ${d.minPayment}</p>
                                </div>
                            </div>
                        ))}
                        {data.debts.length === 0 && <p className="text-txt-secondary text-sm">No debts added yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;