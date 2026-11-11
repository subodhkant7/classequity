import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { trips } from '@/db/schema';
import { demoPreviewScope, optionalActor } from '@/server/auth';
import { CANONICAL_DEMO_TRIP_ID } from '@/server/demo-policy';
import Parent from '@/components/parent';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const a = await optionalActor();
  if (!a) redirect('/login');
  if (a.role !== 'parent') redirect('/login');
  const activities = await db
    .select({ id: trips.id, name: trips.name })
    .from(trips)
    .where(
      a.mode === 'demo'
        ? and(eq(trips.schoolId, a.schoolId), eq(trips.id, CANONICAL_DEMO_TRIP_ID))
        : eq(trips.schoolId, a.schoolId),
    );
  const selected = (await searchParams).trip;
  const previewScope = demoPreviewScope(a);
  return (
    <Parent
      key={previewScope ?? a.userId}
      a={a}
      previewScope={previewScope}
      trips={activities}
      selected={activities.some((t) => t.id === selected) ? selected : undefined}
    />
  );
}
