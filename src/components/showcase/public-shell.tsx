'use client';
import { useHydrated } from '../use-hydrated';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X, ArrowRight } from 'lucide-react';
import { Brand } from '../brand';
const links = [
  ['/how-it-works', 'How it works'],
  ['/demo', 'Interactive demo'],
  ['/technology', 'Behind the product'],
];
export function PublicShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return (
    <div className="public-site">
      <a className="skip-link" href="#public-main">
        Skip to content
      </a>
      <header className="public-header">
        <Brand />
        <button
          ref={toggle}
          disabled={!hydrated}
          className="public-menu-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav id="public-navigation" aria-label="Product" className={open ? 'is-open' : ''}>
          {links.map(([url, label]) => (
            <Link
              key={url}
              href={url}
              aria-current={path === url ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link href="/login" className="public-workspace" onClick={() => setOpen(false)}>
            School workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="public-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="public-footer">
        <div>
          <Brand />
          <p>
            Every child belongs on the trip.
            <br />
            Every payment is accounted for.
          </p>
          <span className="eyebrow">Built for the PayPal AI Hackathon 2026</span>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/demo">Guided product tour</Link>
          <Link href="/how-it-works">Pricing & funding lab</Link>
          <Link href="/technology">Technology & evidence</Link>
          <Link href="/login">Functional workspace</Link>
        </div>
        <div>
          <h2>Know the boundary</h2>
          <p>
            Sample school data. PayPal Sandbox lifecycle and signed callbacks verified.
            Hosted WhatsApp callbacks remain unverified.
          </p>
          <a href="https://github.com/subodhkant7/classequity" target="_blank" rel="noreferrer">
            Public source & documentation <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>ClassEquity · Thoughtful coordination. Clearer finances.</span>
          <Link href="/technology#boundaries">Verification & limitations</Link>
        </div>
      </footer>
    </div>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={`public-button ${secondary ? 'secondary' : ''}`}>
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="public-section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
