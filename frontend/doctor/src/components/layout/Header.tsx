"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navLinks = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/patients", label: "환자 목록" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14">
      <div className="max-w-screen-xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-base font-bold text-blue-600 tracking-tight select-none">
            MEDIGER
          </span>
          <nav className="flex gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href))
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-700 font-medium">Dr. 김철수</span>
          <span className="text-gray-200">|</span>
          <button className="text-gray-400 hover:text-gray-700 transition-colors">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
