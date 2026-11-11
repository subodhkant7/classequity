'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Compass,
  Users,
  HeartHandshake,
  ChartNoAxesCombined,
  MessageCircle,
  Settings,
  ArrowUpRight,
  ChevronRight,
  LogOut,
  Menu,
  ShieldCheck,
  Leaf,
  Wallet,
  Search,
  X,
} from 'lucide-react';
import type { Actor } from '@/server/auth';
import { Brand } from './brand';
import { api, Badge } from './ui';
const links = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/trips', label: 'School trips', icon: Compass },
  { path: '/registrations', label: 'Registrations', icon: Users },
  { path: '/sponsorship', label: 'Sponsorship', icon: HeartHandshake },
  { path: '/analytics', label: 'Financial intelligence', icon: ChartNoAxesCombined },
  { path: '/messages', label: 'Communication', icon: MessageCircle },
];
export function Shell({
  a,
  school,
  children,
}: {
  a: Actor;
  school: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prior = menuTrigger.current || (document.activeElement as HTMLElement);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [],
      ).filter((el) => el.getClientRects().length > 0);
    items()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const list = items(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [open]);
  const label =
    links.find((l) => pathname.startsWith(l.path))?.label ??
    (pathname.startsWith('/finance') ? 'Finance desk' : 'Workspace settings');
  return (
    <div className="shell">
      <a href="#workspace-main" className="skip-link">
        Skip to workspace
      </a>
      {open && (
        <button
          className="workspace-backdrop"
          aria-label="Dismiss navigation"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-navigation"
        aria-label="School navigation"
        className={`sidebar ${open ? 'open' : ''}`}
      >
        <Brand />
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav className="sidebar-nav">
          {links
            .filter((l) => !['/messages'].includes(l.path) || a.role !== 'teacher')
            .map((l) => (
              <Link
                key={l.path}
                href={l.path}
                className={
                  pathname === l.path || (l.path === '/trips' && pathname.startsWith('/trips/'))
                    ? 'active'
                    : ''
                }
                onClick={() => setOpen(false)}
              >
                <l.icon size={17} strokeWidth={1.7} />
                {l.label}
              </Link>
            ))}
        </nav>
        <div style={{ marginTop: 32 }} className="sidebar-label">
          ADMINISTRATION
        </div>
        <nav className="sidebar-nav">
          {a.role === 'finance' && (
            <Link href="/finance" className={pathname === '/finance' ? 'active' : ''}>
              <Wallet size={17} />
              Finance desk
            </Link>
          )}
          {a.role !== 'teacher' && (
            <Link href="/settings" className={pathname === '/settings' ? 'active' : ''}>
              <Settings size={17} />
              Workspace settings
            </Link>
          )}
          <Link
            href="/parent"
            onClick={(e) => {
              if (a.role !== 'parent') {
                e.preventDefault();
                router.push('/login');
              }
            }}
          >
            <ArrowUpRight size={17} />
            Parent experience
          </Link>
        </nav>
        <div className="bottom">
          <div className="sidebar-note">
            <Leaf size={21} color="#cce2a9" />
            <h3 style={{ marginTop: 10 }}>Every child belongs.</h3>
            <p>A little collective care makes a world of discovery possible.</p>
          </div>
          <div className="user-card">
            <div className="avatar">
              {a.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div style={{ flex: 1 }}>
              <p>{a.name}</p>
              <small>
                {a.role} · {a.mode}
              </small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-button"
              style={{ color: '#a9c3ad' }}
              onClick={async () => {
                await api('auth/logout', {});
                router.push('/');
                router.refresh();
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {open && (
          <button
            className="icon-button mobile-menu"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', top: 9, right: 7, color: '#d8e6c8' }}
          >
            <X size={19} />
          </button>
        )}
      </aside>
      <div className="workspace" inert={open}>
        <header className="topbar">
          <div className="flex">
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(true)}
              ref={menuTrigger}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="workspace-navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={12} />
              <strong>{label}</strong>
            </div>
          </div>
          <div className="top-actions">
            <div className="top-school">
              {school}
              <small>School activity coordination</small>
            </div>
            <Badge tone={a.mode === 'demo' ? 'green' : 'amber'}>
              {a.mode === 'demo' ? 'Demo workspace' : 'PayPal sandbox'}
            </Badge>
            <Link href="/trips" className="icon-button" aria-label="Find school trips">
              <Search size={18} />
            </Link>
            <span className="avatar" style={{ width: 29, height: 29, fontSize: 10 }}>
              OA
            </span>
          </div>
        </header>
        <main className="main" id="workspace-main" tabIndex={-1}>
          <div className="demo-strip">
            <ShieldCheck size={13} />
            {a.mode === 'demo'
              ? 'Interactive demo workspace · Sample school data · All payments and messages are simulated.'
              : 'Sandbox integration workspace · Sample student records · Human buyer approval required · USD only'}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
