import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ setToken }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        
        const endpoint = isRegister ? '/api/user/register' : '/api/user/login';
        
        try {
            const res = await fetch(`http://localhost:5001${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }
            
            // Success: Store Token
            localStorage.setItem('auth-token', data.token);
            setToken(data.token);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="bg-bg-card p-8 rounded-2xl w-full max-w-md border border-border shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-txt-primary mb-2">{isRegister ? 'Join Velox' : 'Sign In'}</h2>
                    <p className="text-txt-secondary text-sm">Secure Financial Dashboard</p>
                </div>
                
                {error && (
                    <div className="bg-red-500/10 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-500/20 font-medium">
                        <AlertCircle size={16}/> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div className="relative">
                            <input type="text" placeholder="Username" className="w-full bg-bg-secondary border border-border p-3 pl-10 rounded-lg text-txt-primary outline-none focus:border-brand" onChange={e => setFormData({...formData, username: e.target.value})} required />
                            <User className="absolute left-3 top-3.5 text-txt-secondary" size={18} />
                        </div>
                    )}
                    <div className="relative">
                        <input type="email" placeholder="Email Address" className="w-full bg-bg-secondary border border-border p-3 pl-10 rounded-lg text-txt-primary outline-none focus:border-brand" onChange={e => setFormData({...formData, email: e.target.value})} required />
                        <Mail className="absolute left-3 top-3.5 text-txt-secondary" size={18} />
                    </div>
                    <div className="relative">
                        <input type="password" placeholder="Password" className="w-full bg-bg-secondary border border-border p-3 pl-10 rounded-lg text-txt-primary outline-none focus:border-brand" onChange={e => setFormData({...formData, password: e.target.value})} required />
                        <Lock className="absolute left-3 top-3.5 text-txt-secondary" size={18} />
                    </div>
                    
                    <button disabled={loading} className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all mt-2">
                        {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Access Dashboard')}
                    </button>
                </form>

                <p className="text-txt-secondary text-xs text-center mt-6 cursor-pointer hover:text-brand font-medium" onClick={() => {setIsRegister(!isRegister); setError('');}}>
                    {isRegister ? 'Already have an account? Log In' : 'New here? Create Account'}
                </p>
            </motion.div>
        </div>
    );
};
export default Login;