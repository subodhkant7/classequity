import { Protected } from '@/components/protected';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <Protected view="trips" />;
}
