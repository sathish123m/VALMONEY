import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Wallet, FileText as Receipt, UserCircle, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ logout }) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink to={to} className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'text-txt-secondary hover:bg-bg-secondary hover:text-txt-primary'}`
    }>
      <Icon size={20} /> <span className="hidden md:block">{label}</span>
    </NavLink>
  );

  return (
    <div className="w-20 md:w-64 h-full bg-bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
      {/* CLICKABLE LOGO */}
      <Link to="/" className="p-6 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-xl">F</div>
        <span className="hidden md:block font-bold text-xl tracking-tight text-txt-primary">VALMONEY</span>
      </Link>

      <nav className="flex-1 px-4 space-y-2 mt-4 custom-scroll">
        <NavItem to="/" icon={LayoutDashboard} label="Overview" />
        <NavItem to="/transactions" icon={Wallet} label="Ledger" />
        <NavItem to="/receipts" icon={Receipt} label="Receipt Vault" />
        <NavItem to="/profile" icon={UserCircle} label="Identity" />
      </nav>

      <div className="p-4 border-t border-border space-y-2 bg-bg-card">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-txt-secondary hover:bg-bg-secondary transition-all">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="hidden md:block">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all">
          <LogOut size={20} /> <span className="hidden md:block">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
export default Sidebar;