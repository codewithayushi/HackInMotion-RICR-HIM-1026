import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-10 pb-8 mt-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          
          {/* Logo & Description */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.jpg"
                alt="Smart City Logo"
                className="w-9 h-9 rounded-xl object-cover border border-slate-700 shadow-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-lg font-extrabold text-white tracking-tight">SmartCity Portal</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Civic Infrastructure & Public Grievance Redressal System. Empowering citizens and city administrators.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Civic Services</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#roads" className="hover:text-amber-400 transition-colors">Roads & Pothole Repair</a></li>
              <li><a href="#sanitation" className="hover:text-amber-400 transition-colors">Sanitation & Garbage Disposal</a></li>
              <li><a href="#water" className="hover:text-amber-400 transition-colors">Water Pipeline & Sewage</a></li>
              <li><a href="#electricity" className="hover:text-amber-400 transition-colors">Street Light Maintenance</a></li>
            </ul>
          </div>

          {/* Governance Guidelines */}
          <div>
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Governance</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#sla" className="hover:text-amber-400 transition-colors">Service Level Agreement (SLA)</a></li>
              <li><a href="#citizens-charter" className="hover:text-amber-400 transition-colors">Citizen Rights Charter</a></li>
              <li><a href="#privacy" className="hover:text-amber-400 transition-colors">Data Privacy & Security Policy</a></li>
              <li><a href="#transparency" className="hover:text-amber-400 transition-colors">Public Audit & Transparency</a></li>
            </ul>
          </div>

          {/* Helpdesk */}
          <div>
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Municipal Support</h4>
            <div className="space-y-2 text-slate-300">
              <p>📞 Emergency Helpline: <strong className="text-amber-400">1800-11-2024</strong></p>
              <p>✉️ Support Email: <strong className="text-white">support@smartcity.gov.in</strong></p>
              <p>🕒 Hours: 24x7 Civic Resolution Desk</p>
            </div>
          </div>

        </div>

        {/* Bottom Rights */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} SmartCity Civic Platform. All rights reserved.</p>
          <div className="flex space-x-4 text-slate-400">
            <span>HackInMotion 2026</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono font-semibold">Live Deployment Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
