import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Profile from './pages/Profile';
import Login from './components/Login';

function App() {
  const [token, setToken] = useState(localStorage.getItem('auth-token'));

  const logout = () => {
    localStorage.removeItem('auth-token');
    setToken(null);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {!token ? (
            <Route path="*" element={<Login setToken={setToken} />} />
          ) : (
            <Route path="/" element={<Layout logout={logout} />}>
              <Route index element={<Dashboard token={token} />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
export default App;