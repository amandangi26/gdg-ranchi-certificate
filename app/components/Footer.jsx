'use client'

import { memo } from 'react'
import { Mail, ArrowRight, Users, ExternalLink, Award } from 'lucide-react'
import Link from 'next/link'

function InstagramIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function LinkedinIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function TwitterIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const LinktreeIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.51 5.92 17.65 0l3.85 2.75-4.4 5.25h5.4v4.55h-5.23l4.63 5.48-3.9 2.57-4.49-6.3V24h-4.9v-9.7l-4.48 6.3-3.9-2.57 4.63-5.48H0V7.99h5.39L1 2.75 4.85 0l4.14 5.92h4.52z" />
  </svg>
)

const SOCIALS = [
  {
    name: 'Instagram',
    label: '@gdgranchi',
    url: 'https://www.instagram.com/gdgranchi/?hl=en',
    icon: InstagramIcon,
    hoverClass: 'hover:bg-[#E1306C] hover:text-white',
  },
  {
    name: 'LinkedIn',
    label: 'GDG Ranchi',
    url: 'https://www.linkedin.com/company/gdgrnc?originalSubdomain=in',
    icon: LinkedinIcon,
    hoverClass: 'hover:bg-[#0A66C2] hover:text-white',
  },
  {
    name: 'Twitter',
    label: '@gdgrnc',
    url: 'https://x.com/gdgrnc',
    icon: TwitterIcon,
    hoverClass: 'hover:bg-black hover:text-white',
  },
  {
    name: 'Linktree',
    label: 'linktr.ee/gdgranchi',
    url: 'https://linktr.ee/gdgranchi',
    icon: LinktreeIcon,
    hoverClass: 'hover:bg-gdgGreen hover:text-white',
  },
  {
    name: 'Email',
    label: 'gdgranchi@gmail.com',
    url: 'mailto:gdgranchi@gmail.com',
    icon: Mail,
    hoverClass: 'hover:bg-gdgYellow hover:text-black',
  },
]

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_WEBSITE_URL || 'https://devfest.gdgranchi.in'
const COMMUNITY_URL = 'https://gdg.community.dev/gdg-ranchi/'

const PORTAL_LINKS = [
  { label: 'Download Certificate', href: '/' },
  { label: 'Verify Credential', href: '/' },
  { label: 'Support & Queries', href: 'mailto:gdgranchi@gmail.com', external: true },
]

const MAIN_SITE_LINKS = [
  { label: 'DevFest Main Website', href: MAIN_SITE_URL, external: true, highlight: true },
  { label: 'GDG Ranchi Chapter', href: COMMUNITY_URL, external: true },
  { label: 'Community Guidelines', href: 'https://developers.google.com/community-guidelines', external: true },
]

function Footer() {
  return (
    <footer
      id="contact"
      className="bg-[#0D2818] text-white border-black relative overflow-hidden -mt-3 md:-mt-8"
    >
      {/* Top Tribal Pattern Border */}
      <div className="tribal-border h-2 border-b-2 border-black" />

      {/* Subtle Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gdgGreen/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gdgYellow/5 blur-[100px]" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_0.9fr_0.9fr_1.3fr] gap-8 xl:gap-10">
          {/* Column 1: Brand & Community Identity */}
          <div className="space-y-4">
            <a
              href={`${MAIN_SITE_URL}/`}
              className="flex items-center gap-3 group w-fit select-none"
            >
              <img
                src="/GDG_Logo.svg"
                alt="GDG Logo"
                loading="lazy"
                decoding="async"
                className="h-7 w-auto group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.src = '/GDG-icon.svg'
                }}
              />
              <span className="font-black text-2xl tracking-tight text-white group-hover:text-gdgBlue transition-colors">
                Ranchi
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-gdgYellow text-black px-2.5 py-0.5 rounded-full border border-black shadow-[2px_2px_0_0_#000]">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                DevFest 2026
              </span>
            </a>

            <p className="text-sm text-white/70 leading-relaxed max-w-[440px]">
              Google Developer Groups Ranchi is an open community bringing together developers,
              designers, and students across Jharkhand to learn, share knowledge, and build with
              cutting-edge technologies.
            </p>

            {/* Email Contact Pill */}
            <div className="pt-1">
              <a
                href="mailto:gdgranchi@gmail.com"
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border-2 border-black/40 hover:border-black shadow-[2px_2px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all text-xs font-bold select-none group"
              >
                <Mail
                  size={14}
                  className="text-gdgYellow group-hover:text-black transition-colors"
                />
                <span>gdgranchi@gmail.com</span>
                <ArrowRight
                  size={13}
                  className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                />
              </a>
            </div>

            {/* Tactile Social Buttons */}
            <div className="pt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-2.5">
                Connect With Us
              </div>
              <div className="flex flex-wrap gap-2.5">
                {SOCIALS.map((s) => {
                  const Icon = s.icon
                  return (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      title={s.name}
                      className={`w-9 h-9 rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer select-none ${s.hoverClass}`}
                    >
                      <Icon size={15} />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Portal Navigation */}
          <div>
            <div className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-wider text-gdgYellow mb-4">
              <span className="w-2 h-2 rounded-full bg-gdgYellow" />
              <span>Certificate Portal</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              {PORTAL_LINKS.map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a
                      href={item.href}
                      className="flex items-center gap-2 text-white/75 hover:text-white transition-all group w-fit"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gdgYellow opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                      <span className="group-hover:translate-x-0.5 transition-transform font-medium">
                        {item.label}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 text-white/75 hover:text-white transition-all group w-fit"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gdgYellow opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                      <span className="group-hover:translate-x-0.5 transition-transform font-medium">
                        {item.label}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Main Website Links */}
          <div>
            <div className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-wider text-gdgBlue mb-4">
              <span className="w-2 h-2 rounded-full bg-gdgBlue" />
              <span>DevFest Ranchi</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              {MAIN_SITE_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 transition-all group w-fit ${
                      item.highlight
                        ? 'text-gdgYellow font-black hover:text-white underline decoration-2 underline-offset-4'
                        : 'text-white/75 hover:text-white font-medium'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gdgBlue opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {item.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Event Concluded Callout Card */}
          <div className="bg-white/5 border-2 border-black/60 rounded-2xl p-5 shadow-[4px_4px_0_0_#000] flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gdgGreen/20 border border-gdgGreen/40 text-[10px] font-black text-gdgGreen uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-gdgGreen" />
                Event Concluded
              </div>
              <h4 className="font-black text-base text-white tracking-tight leading-snug">
                Thank You For Joining Us!
              </h4>
              <p className="text-xs text-white/65 leading-relaxed">
                DevFest Ranchi 2026 has concluded with 500+ attendees. Stay connected with the chapter for future meetups and hackathons.
              </p>
            </div>

            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black font-black text-xs uppercase tracking-wider border-2 border-white/20 hover:border-black shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all select-none"
            >
              <Users size={14} className="text-gdgYellow" />
              <span>Join GDG Community</span>
              <ExternalLink size={12} className="ml-0.5" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/55">
          <span>© 2026 Google Developer Groups Ranchi. All rights reserved.</span>

          {/* Signature 4 Google Brand Dots */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gdgBlue" />
            <span className="w-2 h-2 rounded-full bg-gdgRed" />
            <span className="w-2 h-2 rounded-full bg-gdgYellow" />
            <span className="w-2 h-2 rounded-full bg-gdgGreen" />
          </div>

          <span>Made with ❤️ by GDG Ranchi Tech Team</span>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
