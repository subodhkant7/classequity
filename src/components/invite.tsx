'use client';
import { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Brand } from './brand';
import { Button, Notice, api } from './ui';
export function Invite({ token }: { token: string }) {
  const [error, setError] = useState('');
  return (
    <main style={{ maxWidth: 500, margin: '10vh auto', padding: 25 }}>
      <Brand />
      <section className="card stack" style={{ marginTop: 35 }}>
        <ShieldCheck size={30} />
        <h1 style={{ fontSize: 28 }}>Your family’s invitation.</h1>
        <p className="muted">
          Open a private session to register a sample student, record consent, and view only your
          family’s payment. This link works once and expires automatically.
        </p>
        {error && <Notice error>{error}</Notice>}
        <Button
          onClick={async () => {
            try {
              const r = await api<{ redirect: string }>('auth/redeem', { token });
              window.location.assign(r.redirect);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Open secure parent portal <ArrowRight size={15} />
        </Button>
      </section>
    </main>
  );
}
