import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Smart City Logo & Platform Name */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/logo.jpg"
                alt="Smart City Logo"
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">SmartCity</span>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">Issue Reporting & Resolution Platform</p>
              </div>
            </Link>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/citizen'}
                  className="text-slate-700 hover:text-blue-700 font-semibold px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  Dashboard
                </Link>

                {!isAdmin && (
                  <Link
                    to="/report"
                    className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Report Issue</span>
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="text-slate-700 hover:text-blue-700 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors flex items-center gap-1"
                  title="Profile & Account Settings"
                >
                  ⚙️ Settings
                </Link>

                <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isAdmin ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {isAdmin ? `Admin (${user?.department || 'General'})` : 'Citizen'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-600 hover:text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-slate-700 hover:text-blue-700 font-semibold px-3.5 py-2 rounded-xl text-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
