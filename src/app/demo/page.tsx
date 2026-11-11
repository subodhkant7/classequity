import type { Metadata } from 'next';
import { PublicShell } from '@/components/showcase/public-shell';
import { DemoTour } from '@/components/showcase/demo-tour';
import { chapters } from '@/lib/showcase';
export const metadata: Metadata = {
  title: 'Interactive product tour',
  description:
    'Explore six chapters of ClassEquity, from a demonstration museum trip to real editable financial intelligence. No sign-in or provider credentials needed.',
};
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter } = await searchParams;
  const index = chapters.findIndex((c) => c.id === chapter);
  return (
    <PublicShell>
      <DemoTour initialChapter={Math.max(0, index)} />
    </PublicShell>
  );
}
