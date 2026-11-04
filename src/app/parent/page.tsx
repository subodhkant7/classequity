import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { trips } from '@/db/schema';
import { optionalActor } from '@/server/auth';
import Parent from '@/components/parent';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const a = await optionalActor();
  if (!a) redirect('/login');
  if (a.role !== 'parent') redirect('/login');
  const activities = await db
    .select({ id: trips.id, name: trips.name })
    .from(trips)
    .where(eq(trips.schoolId, a.schoolId));
  const selected = (await searchParams).trip;
  return (
    <Parent
      a={a}
      trips={activities}
      selected={activities.some((t) => t.id === selected) ? selected : undefined}
    />
  );
}
