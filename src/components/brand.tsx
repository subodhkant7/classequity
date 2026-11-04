import { Sprout } from 'lucide-react';
import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ClassEquity home">
      <span className="brand-mark">
        <Sprout size={21} strokeWidth={2} />
      </span>
      ClassEquity<span style={{ color: '#8faa68' }}>•</span>
    </Link>
  );
}
