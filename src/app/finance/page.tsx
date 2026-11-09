import { Protected } from '@/components/protected';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  return <Protected view="finance" tripId={(await searchParams).trip} />;
}
