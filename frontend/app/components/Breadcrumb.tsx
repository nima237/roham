'use client';
import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faHome } from '@fortawesome/free-solid-svg-icons';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-reverse space-x-2 text-sm text-gray-600 mb-8" dir="rtl">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
      >
        <FontAwesomeIcon icon={faHome} className="w-4 h-4" />
        <span>داشبورد</span>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3 text-gray-400 mx-2" />
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
            >
              {item.icon && <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-2 text-gray-900 font-semibold bg-blue-50 px-3 py-2 rounded-lg">
              {item.icon && <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-blue-600" />}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}; 