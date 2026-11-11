'use client';
import { useState } from 'react';
import { useHydrated } from '@/components/use-hydrated';
import Link from 'next/link';
import { ArrowRight, GraduationCap, ShieldCheck, Wallet, Users } from 'lucide-react';
import { Brand } from '@/components/brand';
import Museum from '@/components/museum';
import { Button, Field, Notice, api } from '@/components/ui';
import type { Role } from '@/lib/domain';
export default function Login() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<'demo' | 'sandbox'>('demo');
  const [role, setRole] = useState<Role>('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <h1>
          More than a trip.
          <br />
          <em>A place for everyone.</em>
        </h1>
        <p>
          A calmer way to coordinate school adventures, from the first registration to the last
          verified payment.
        </p>
        <Museum className="illustration" />
      </aside>
      <main className="auth-form">
        <div className="auth-form-inner">
          <Link href="/" className="muted" style={{ fontSize: 11 }}>
            ← Back to ClassEquity
          </Link>
          <h1 style={{ marginTop: 30 }}>Welcome to your school.</h1>
          <p>Choose a role to explore Oakwood Academy, our demo school.</p>
          <div className="tabs">
            <button
              disabled={!hydrated}
              className={mode === 'demo' ? 'active' : ''}
              onClick={() => {
                setMode('demo');
                setError('');
              }}
            >
              Interactive demo
            </button>
            <button
              disabled={!hydrated}
              className={mode === 'sandbox' ? 'active' : ''}
              onClick={() => {
                setMode('sandbox');
                setRole('admin');
                setError('');
              }}
            >
              Sandbox workspace
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                const r = await api<{ redirect: string }>('auth/login', { mode, role, password });
                window.location.assign(r.redirect);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
            className="stack"
          >
            <div className="role-options">
              {(
                [
                  {
                    id: 'admin',
                    title: 'School admin',
                    text: 'Trips & coordination',
                    icon: GraduationCap,
                  },
                  {
                    id: 'finance',
                    title: 'Finance admin',
                    text: 'Restricted financial access',
                    icon: Wallet,
                  },
                  {
                    id: 'teacher',
                    title: 'Teacher',
                    text: 'Safe aggregate view',
                    icon: ShieldCheck,
                  },
                  ...(mode === 'demo'
                    ? [
                        {
                          id: 'parent',
                          title: 'Parent',
                          text: 'Registration & payment',
                          icon: Users,
                        },
                      ]
                    : []),
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={!hydrated}
                  aria-pressed={role === r.id}
                  className={`role-option ${role === r.id ? 'active' : ''}`}
                  onClick={() => setRole(r.id as Role)}
                >
                  <r.icon size={20} />
                  <strong>{r.title}</strong>
                  <small>{r.text}</small>
                </button>
              ))}
            </div>
            {mode === 'sandbox' && (
              <Field
                label="Sandbox administrator password"
                hint="Configured privately in ADMIN_PASSWORD. Parents use single-use school invitations."
              >
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
            )}
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" disabled={!hydrated}>
              {mode === 'demo' ? 'Enter the demo' : 'Open sandbox workspace'}{' '}
              <ArrowRight size={15} />
            </Button>
            <p className="muted" style={{ fontSize: 10, textAlign: 'center' }}>
              {mode === 'demo'
                ? 'Demo accounts and simulated payments. No real money moves.'
                : 'Demo accounts. PayPal Sandbox only. No live payments.'}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
