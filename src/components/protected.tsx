import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { schools } from '@/db/schema';
import { optionalActor } from '@/server/auth';
import { Shell } from './shell';
import Workspace from './workspace';
export async function Protected({ view, tripId }: { view: string; tripId?: string }) {
  const a = await optionalActor();
  if (!a) redirect('/login');
  if (a.role === 'parent') redirect('/parent');
  const [school] = await db.select().from(schools).where(eq(schools.id, a.schoolId));
  return (
    <Shell a={a} school={school.name}>
      {a.mode === 'demo' && process.env.HOSTED_RESTRICT_PUBLIC_AI === 'true' && (
        <p className="notice">
          Interactive demo workspace · sample school data. Live Gemini tools require restricted
          sandbox access; the guided demo includes recorded AI examples. Payments and messages here
          are simulations.
        </p>
      )}
      <Workspace
        a={a}
        view={view}
        tripId={tripId}
        studioLicense={view === 'analytics' ? process.env.AG_STUDIO_LICENSE_KEY : undefined}
      />
    </Shell>
  );
}
