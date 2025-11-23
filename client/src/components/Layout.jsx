import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = ({ logout }) => {
  return (
    <div className="flex h-screen w-screen bg-bg-secondary overflow-hidden">
      {/* 1. FIXED SIDEBAR */}
      <Sidebar logout={logout} />
      
      {/* 2. INDEPENDENT SCROLL AREA */}
      <div className="flex-1 h-full ml-20 md:ml-64 scroll-container relative">
        <div className="p-8 max-w-7xl mx-auto min-h-full pb-20">
             <Outlet />
        </div>
      </div>
    </div>
  );
};
export default Layout;