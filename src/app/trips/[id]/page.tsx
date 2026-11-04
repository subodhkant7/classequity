import { Protected } from '@/components/protected';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Protected view="trip" tripId={(await params).id} />;
}
