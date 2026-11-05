'use client'

import { useState } from 'react'
import {
  Menu,
  X,
  ExternalLink,
  Award,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AnnouncementBar from './AnnouncementBar'

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_WEBSITE_URL || 'https://devfest.gdgranchi.in'
const COMMUNITY_URL = 'https://gdg.community.dev/gdg-ranchi/'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname() || '/'
  const isHome = pathname === '/'

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#FFFBF0]/95 backdrop-blur-md border-b-[2.5px] border-black shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      {/* Announcement Marquee Bar */}
      <AnnouncementBar />

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
        {/* Logo & Portal Identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 group text-left select-none"
          >
            <img
              src="/GDG_Logo.svg"
              alt="GDG Logo"
              className="h-6 sm:h-7 w-auto group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.currentTarget.src = '/GDG-icon.svg'
              }}
            />
            <span className="font-black text-[18px] sm:text-[21px] tracking-tight text-black group-hover:text-gdgBlue transition-colors">
              GDG Ranchi
            </span>
          </Link>

          {/* Neo-brutalist "Certificates" Tag */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black bg-[#FBBC05] text-[#111] font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000]">
            <Award className="w-3 h-3 stroke-[2.5]" />
            <span>Official Certificates</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2.5 lg:gap-3 text-sm">
          {/* Primary CTA: Switch to DevFest Main Site */}
          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FBBC05] hover:bg-[#F9AB00] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_0_#000] hover:shadow-[1.5px_1.5px_0_0_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-y-[3px] active:shadow-none transition-all select-none cursor-pointer group"
          >
            <span>DevFest Main Website</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          {/* GDG Community Chapter Link */}
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-y-[2px] transition-all select-none"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Join Community</span>
          </a>
        </div>

        {/* Mobile Action Bar */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile Main Site Switch Button */}
          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FBBC05] text-black font-black text-[10px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000] active:translate-y-0.5 select-none"
          >
            <span>Main Site</span>
            <ExternalLink className="w-3 h-3 stroke-[2.5]" />
          </a>

          {/* Mobile Menu Toggle Button */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-full border-2 border-black transition-all cursor-pointer ${
              mobileOpen
                ? 'bg-black text-white shadow-[2px_2px_0_0_#EA4335]'
                : 'bg-white text-black shadow-[2px_2px_0_0_#000] hover:bg-[#FFFBF0] active:translate-y-0.5'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FFFBF0] border-t-[2.5px] border-black px-4 py-4 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-2">
            {/* Certificates Current Portal Link */}
            <Link
              href="/"
              onClick={() => {
                setMobileOpen(false)
                if (isHome) {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider border-2 border-black bg-black text-white shadow-[2.5px_2.5px_0_0_#4285F4] select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                <span>Certificate Portal</span>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-[#34A853] text-white rounded-full">
                Active
              </span>
            </Link>

            {/* Switch to DevFest Main Site */}
            <a
              href={MAIN_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3 rounded-full bg-[#FBBC05] hover:bg-[#F9AB00] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0_0_#000] flex items-center justify-center gap-2 select-none active:translate-y-0.5 transition-all"
            >
              <span>DevFest Main Website</span>
              <ExternalLink size={14} className="stroke-[2.5]" />
            </a>

            {/* Join Community Button */}
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="w-full py-2.5 rounded-full bg-[#4285F4] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-2 select-none active:translate-y-0.5 transition-all"
            >
              <Users size={14} />
              <span>Join GDG Ranchi Community</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
