import React, { useState } from 'react';
import { Search, Filter, Download, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Transactions = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [txns, setTxns] = useState([
        { id: 1, name: 'Apple Store', date: '2023-10-24', category: 'Electronics', amount: -1299, status: 'Completed' },
        { id: 2, name: 'Freelance Work', date: '2023-10-23', category: 'Income', amount: 3500, status: 'Completed' },
        { id: 3, name: 'Starbucks', date: '2023-10-23', category: 'Food', amount: -15.50, status: 'Pending' },
    ]);
    const [newTxn, setNewTxn] = useState({ name: '', amount: '', category: 'General' });

    // FILTER LOGIC
    const filteredTxns = txns.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // EXPORT LOGIC
    const handleExport = () => {
        const headers = ["Name,Date,Category,Amount,Status"];
        const rows = txns.map(t => `${t.name},${t.date},${t.category},${t.amount},${t.status}`);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ledger_export.csv");
        document.body.appendChild(link);
        link.click();
    };

    // ADD LOGIC
    const handleAdd = (e) => {
        e.preventDefault();
        const txn = {
            id: Date.now(),
            name: newTxn.name,
            date: new Date().toISOString().split('T')[0],
            category: newTxn.category,
            amount: Number(newTxn.amount),
            status: 'Completed'
        };
        setTxns([txn, ...txns]);
        setIsModalOpen(false);
        setNewTxn({ name: '', amount: '', category: 'General' });
    };

    return (
        <div className="animate-enter relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-txt-primary">Ledger</h1>
                    <p className="text-txt-secondary">Detailed history of your financial movements.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">
                        <Download size={18} /> Export
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
                        <Plus size={18} /> Add Transaction
                    </button>
                </div>
            </header>

            {/* SEARCH BAR */}
            <div className="card-base p-4 mb-6">
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-txt-secondary" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-secondary border border-border outline-none focus:border-brand transition-all text-txt-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 rounded-lg border border-border text-txt-secondary hover:bg-bg-secondary"><Filter size={20} /></button>
                </div>
            </div>

            {/* TABLE */}
            <div className="card-base overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-bg-secondary border-b border-border text-txt-secondary text-sm uppercase tracking-wider">
                            <th className="p-4 font-semibold">Transaction</th>
                            <th className="p-4 font-semibold">Category</th>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTxns.length > 0 ? filteredTxns.map(t => (
                            <tr key={t.id} className="border-b border-border last:border-0 hover:bg-bg-secondary/50 transition-colors">
                                <td className="p-4 font-medium text-txt-primary">{t.name}</td>
                                <td className="p-4 text-txt-secondary">{t.category}</td>
                                <td className="p-4 text-txt-secondary">{t.date}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className={`p-4 font-bold text-right ${t.amount > 0 ? 'text-green-500' : 'text-txt-primary'}`}>
                                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="p-8 text-center text-txt-secondary">No transactions found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-4 border-b border-border bg-bg-secondary">
                                <h3 className="font-bold text-txt-primary">New Transaction</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-txt-secondary hover:text-red-500"><X size={20}/></button>
                            </div>
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-txt-secondary uppercase">Description</label>
                                    <input required className="w-full bg-bg-secondary border border-border rounded p-2 text-txt-primary focus:border-brand outline-none" placeholder="e.g. Grocery" value={newTxn.name} onChange={e=>setNewTxn({...newTxn, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-txt-secondary uppercase">Amount</label>
                                        <input required type="number" className="w-full bg-bg-secondary border border-border rounded p-2 text-txt-primary focus:border-brand outline-none" placeholder="-50.00" value={newTxn.amount} onChange={e=>setNewTxn({...newTxn, amount: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-txt-secondary uppercase">Category</label>
                                        <input required className="w-full bg-bg-secondary border border-border rounded p-2 text-txt-primary focus:border-brand outline-none" placeholder="Food" value={newTxn.category} onChange={e=>setNewTxn({...newTxn, category: e.target.value})} />
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-brand text-white font-bold rounded-lg hover:shadow-lg transition-all mt-4">Save Transaction</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
export default Transactions;