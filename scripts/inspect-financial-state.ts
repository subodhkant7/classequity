import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import { paypal, accessToken, ProviderFailure } from '../src/server/integrations/paypal';
import { minor } from '../src/lib/domain';
async function inspect(path: string, cents: number, label: string) {
  let handoff;
  try {
    handoff = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
  const [stored] = await db.execute(
    sql`select o.order_id,o.mode,b.id as obligation_id,b.cents from ce_payment_operations o join ce_financial_obligations b on b.id=o.obligation_id where o.id=${handoff.operationId}`,
  );
  if (!stored || stored.mode !== 'sandbox' || stored.cents !== cents)
    throw Error('Sandbox obligation mismatch');
  try {
    const order = await paypal.order(String(stored.order_id));
    const pu = order.purchaseUnits?.[0];
    return {
      label,
      available: true,
      status: order.status,
      currency: 'USD',
      cents,
      matchesStoredObligation:
        order.id === stored.order_id &&
        order.purchaseUnits?.length === 1 &&
        pu?.customId === stored.obligation_id &&
        pu?.amount?.currencyCode === 'USD' &&
        minor(pu.amount.value) === cents,
      captures: (pu?.payments?.captures || []).length,
    };
  } catch (e) {
    if (e instanceof ProviderFailure && e.providerCode === 'INVALID_RESOURCE_ID')
      return {
        label,
        available: false,
        status: 'UNAVAILABLE',
        providerCode: e.providerCode,
        currency: 'USD',
        cents,
        matchesStoredObligation: null,
        captures: null,
      };
    throw e;
  }
}
try {
  const tables = await db.execute(
    sql`select table_name from information_schema.tables where table_schema='public' and table_name like 'ce_%'`,
  );
  const migrations = await db.execute(sql`select name from ce_migrations order by name`);
  const counts = await db.execute(
    sql`select (select count(*) from ce_payment_operations) as operations,(select count(*) from ce_paypal_captures) as captures,(select count(*) from ce_refund_operations) as refunds`,
  );
  const orderInspections = [
    await inspect('.data/sandbox-checkout.json', 3200, 'original'),
    await inspect('.data/financial-closure-checkout.json', 100, 'closure verification'),
  ].filter(Boolean);
  const hooksResponse = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/webhooks', {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(15000),
  });
  const hooks = hooksResponse.ok ? await hooksResponse.json() : undefined;
  const evidence = {
    checkedAt: new Date().toISOString(),
    provider: 'PayPal sandbox',
    inspection:
      'read-only order and webhook configuration lookup; no order creation, capture or refund',
    schema: {
      tableCount: tables.length,
      migrations: migrations.map((x) => x.name),
      financialCounts: counts[0],
    },
    orderInspections,
    previousOriginalObservation: {
      checkedAt: '2026-11-04T23:03:46.798Z',
      status: 'PAYER_ACTION_REQUIRED',
      matchesStoredObligation: true,
      cents: 3200,
      captures: 0,
    },
    webhookConfiguration: {
      readStatus: hooksResponse.status,
      registeredCount: hooks?.webhooks?.length ?? null,
      configuredLocally: !!process.env.PAYPAL_WEBHOOK_ID,
      publicClassEquityService: false,
    },
    captureVerified: false,
    refundVerified: false,
  };
  await writeFile(
    'docs/financial-provider-evidence.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(evidence);
} catch (e) {
  console.error({
    inspection: 'UNVERIFIED; no financial mutation',
    code: e instanceof ProviderFailure ? e.providerCode : 'INSPECTION_FAILED',
  });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
