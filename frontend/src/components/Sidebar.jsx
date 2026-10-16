import { NavLink } from 'react-router-dom';
import {
  BarChart3, Camera, History, ImageIcon, Info, LayoutDashboard, Settings, Video, X,
} from 'lucide-react';
import Logo from './Logo.jsx';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/image', label: 'Image Detection', icon: ImageIcon },
  { to: '/video', label: 'Video Detection', icon: Video },
  { to: '/camera', label: 'Live Camera', icon: Camera },
  { to: '/history', label: 'History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/about', label: 'About Project', icon: Info },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-navy-600/60 bg-navy-900/95 p-4 backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <Logo to="/" />
          <button className="btn-ghost !p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/15 text-white ring-1 ring-brand-500/40'
                    : 'text-slate-400 hover:bg-navy-700 hover:text-white'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-2 pt-4 text-xs text-slate-500">VisionAI &middot; YOLO object detection</p>
      </aside>
    </>
  );
}
