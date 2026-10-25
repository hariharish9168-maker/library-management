import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb: React.FC<{ pageTitle?: string }> = ({ pageTitle }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const formatName = (str: string) => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <nav className="flex items-center text-xs text-slate-500 mb-3 space-x-1">
      <Link to="/dashboard" className="flex items-center hover:text-slate-900 transition-colors">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Home</span>
      </Link>

      {pathnames.map((val, idx) => {
        const routeTo = `/${pathnames.slice(0, idx + 1).join('/')}`;
        const isLast = idx === pathnames.length - 1;

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-800">
                {pageTitle || formatName(val)}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-slate-900 transition-colors">
                {formatName(val)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
