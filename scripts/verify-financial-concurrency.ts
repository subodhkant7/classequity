import 'dotenv/config';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { fork, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const schema = `ce_verify_${randomUUID().replaceAll('-', '')}`;
if (!process.env.DATABASE_URL) throw Error('Dedicated PostgreSQL required');
const admin = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
  max: 1,
  prepare: false,
  onnotice: () => {},
  connect_timeout: 15,
});
const local = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
  max: 1,
  prepare: false,
  onnotice: () => {},
  connect_timeout: 15,
  connection: { search_path: schema },
});
type State = {
  id: string;
  order: Record<string, unknown>;
  cap?: Record<string, unknown>;
  refunds: Record<string, unknown>[];
  mutations: number;
  refundMutations: number;
  keys: string[];
  holdCapture?: Promise<void>;
  holdRefund?: Promise<void>;
  holdOrder?: Promise<void>;
  orderSeen?: boolean;
  dropCapture?: boolean;
};
const states = new Map<string, State>();
const server = createServer(async (req, res) => {
  const [kind, id] = req.url!.slice(1).split('/');
  const st = [...states.values()].find(
    (s) => s.id === id || s.cap?.id === id || s.refunds.some((r) => r.id === id),
  );
  if (!st) {
    res.writeHead(404).end();
    return;
  }
  try {
    let value: unknown;
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const b = JSON.parse(Buffer.concat(chunks).toString());
      if (kind === 'capture') {
        st.mutations++;
        st.keys.push(b.key);
        if (st.dropCapture) {
          res.destroy();
          return;
        }
        complete(st);
        await st.holdCapture;
        value = st.order;
      } else {
        st.refundMutations++;
        st.keys.push(b.key);
        const r = {
          id: `R-${b.claimId}`,
          customId: b.claimId,
          status: 'COMPLETED',
          amount: { currencyCode: 'USD', value: (b.cents / 100).toFixed(2) },
          links: [
            {
              rel: 'up',
              href: `https://api.sandbox.paypal.com/v2/payments/captures/${st.cap!.id}`,
            },
          ],
        };
        st.refunds.push(r);
        (st.order.purchaseUnits as { payments: { refunds?: unknown[] } }[])[0].payments.refunds =
          st.refunds.map((r) => ({ id: r.id }));
        await st.holdRefund;
        value = r;
      }
    } else if (kind === 'order') {
      value = structuredClone(st.order);
      if (st.holdOrder && !st.orderSeen) {
        st.orderSeen = true;
        await st.holdOrder;
      }
    } else if (kind === 'capture') value = st.cap;
    else value = st.refunds.find((r) => r.id === id);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(value));
  } catch {
    res.writeHead(500).end();
  }
});
function complete(st: State) {
  st.cap = {
    id: `CAP-${st.id}`,
    status: 'COMPLETED',
    amount: { currencyCode: 'USD', value: '10.00' },
    supplementaryData: { relatedIds: { orderId: st.id } },
    sellerReceivableBreakdown: {
      grossAmount: { currencyCode: 'USD', value: '10.00' },
      paypalFee: { currencyCode: 'USD', value: '0.50' },
    },
    updateTime: '2026-11-04T20:00:00Z',
  };
  st.order.status = 'COMPLETED';
  (st.order.purchaseUnits as { payments?: unknown }[])[0].payments = {
    captures: [{ id: st.cap.id }],
  };
}
async function fixture() {
  const id = randomUUID();
  const st: State = {
    id,
    order: {
      id,
      status: 'APPROVED',
      purchaseUnits: [{ customId: id, amount: { currencyCode: 'USD', value: '10.00' } }],
    },
    refunds: [],
    mutations: 0,
    refundMutations: 0,
    keys: [],
  };
  states.set(id, st);
  await local`insert into ce_trips(id,school_id,name,destination,description,date,deadline,capacity,tiers,state) values(${id},'verify-school','Fictional race','Fictional','Test only','2026-12-01','2026-11-30',1,'[{"min":1,"cents":1000}]','FROZEN')`;
  await local`insert into ce_pricing_snapshots(id,trip_id,seat_cents,count,policy) values(${id},${id},1000,1,'[{"min":1,"cents":1000}]')`;
  await local`insert into ce_financial_obligations(id,trip_id,snapshot_id,user_id,kind,cents) values(${id},${id},${id},'verify-finance','SPONSOR',1000)`;
  await local`insert into ce_payment_operations(id,obligation_id,school_id,mode,request_key,order_id,status) values(${id},${id},'verify-school','sandbox',${randomUUID()},${id},'APPROVED')`;
  return st;
}
function gate() {
  let release!: () => void;
  return { promise: new Promise<void>((r) => (release = r)), release: () => release() };
}
async function until(test: () => boolean) {
  const start = Date.now();
  while (!test()) {
    if (Date.now() - start > 20000) throw Error('Worker barrier timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
}
type Worker = {
  child: ChildProcess;
  call: (
    action: string,
    id: string,
    extra?: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};
const workers: Worker[] = [];
async function worker(base: string): Promise<Worker> {
  const child = fork('scripts/financial-worker.ts', [], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env, NODE_ENV: 'test', CE_TEST_SCHEMA: schema, FINANCIAL_FAKE_URL: base },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }
  >();
  const ready = new Promise<void>((resolve, reject) => {
    child.once('exit', () => reject(Error('Worker exited before ready')));
    child.on('message', (m: { ready?: boolean; id: number }) => {
      if (m.ready) resolve();
      else {
        pending.get(m.id)?.resolve(m as unknown as Record<string, unknown>);
        pending.delete(m.id);
      }
    });
  });
  child.on('exit', () => {
    for (const p of pending.values()) p.reject(Error('Worker process interrupted'));
    pending.clear();
  });
  const w: Worker = {
    child,
    call: (action, id, extra = {}) =>
      new Promise((resolve, reject) => {
        const key = ++seq;
        pending.set(key, { resolve, reject });
        child.send({ id: key, action, operationId: id, ...extra });
      }),
  };
  workers.push(w);
  await ready;
  return w;
}
const evidence: { scenario: string; passed: boolean; providerMutations: number }[] = [];
let created = false;
let stage = 'connect';
try {
  const [db] = await admin`select current_database() as name`;
  assert.equal(db.name, 'classequity');
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  stage = 'migrations';
  for (const file of (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort()) {
    const content = (await readFile(`drizzle/${file}`, 'utf8')).replaceAll(
      '"public".',
      `"${schema}".`,
    );
    for (const part of content.split('--> statement-breakpoint'))
      if (part.trim()) await local.unsafe(part);
  }
  await local`insert into ce_schools(id,name,mode) values('verify-school','Fictional concurrency school','sandbox')`;
  await local`insert into ce_users(id,name,email) values('verify-finance','Fictional verifier','verifier@example.test')`;
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  stage = 'start-workers';
  let one = await worker(base);
  const two = await worker(base);
  assert.notEqual(one.child.pid, two.child.pid);
  {
    stage = 'capture-race';
    const st = await fixture();
    const hold = gate();
    st.holdCapture = hold.promise;
    const first = one.call('capture', st.id);
    await until(() => st.mutations === 1);
    // Simulate provider visibility delay while the first mutation is in flight.
    const completed = structuredClone(st.order);
    const cap = st.cap;
    st.order = {
      id: st.id,
      status: 'APPROVED',
      purchaseUnits: [{ customId: st.id, amount: { currencyCode: 'USD', value: '10.00' } }],
    };
    assert.equal((await two.call('capture', st.id)).status, 409);
    assert.equal((await two.call('settle', st.id)).error, undefined);
    const [during] = await local`select status from ce_payment_operations where id=${st.id}`;
    assert.equal(during.status, 'CAPTURING');
    st.order = completed;
    st.cap = cap;
    hold.release();
    assert.equal((await first).error, undefined);
    assert.equal((await two.call('capture', st.id)).error, undefined);
    assert.equal(st.mutations, 1);
    evidence.push({
      scenario: 'two processes capture + in-flight reconciliation + duplicate',
      passed: true,
      providerMutations: st.mutations,
    });
  }
  {
    stage = 'stale-read';
    const st = await fixture();
    const old = gate();
    st.holdOrder = old.promise;
    const stale = one.call('settle', st.id);
    await until(() => !!st.orderSeen);
    const hold = gate();
    st.holdCapture = hold.promise;
    const capture = two.call('capture', st.id);
    await until(() => st.mutations === 1);
    old.release();
    assert.equal((await stale).code, 'STALE_READBACK');
    hold.release();
    assert.equal((await capture).error, undefined);
    assert.equal(st.mutations, 1);
    evidence.push({
      scenario: 'read begun before another process claimed capture cannot overwrite claim',
      passed: true,
      providerMutations: 1,
    });
  }
  {
    stage = 'capture-process-crash';
    const st = await fixture();
    const hold = gate();
    st.holdCapture = hold.promise;
    const lost = one.call('capture', st.id).catch(() => ({ interrupted: true }));
    await until(() => st.mutations === 1);
    one.child.kill('SIGKILL');
    await lost;
    hold.release();
    assert.equal((await two.call('capture', st.id)).error, undefined);
    assert.equal(st.mutations, 1);
    one = await worker(base);
    evidence.push({
      scenario: 'process killed after provider capture; independent process recovers by GET',
      passed: true,
      providerMutations: 1,
    });
  }
  {
    stage = 'network-timeout';
    const st = await fixture();
    st.dropCapture = true;
    assert.equal((await one.call('capture', st.id)).error, true);
    assert.equal((await two.call('capture', st.id)).status, 409);
    assert.equal(st.mutations, 1);
    const [op] =
      await local`select status,capture_key from ce_payment_operations where id=${st.id}`;
    assert.equal(op.status, 'UNKNOWN');
    assert.equal(op.capture_key, st.keys[0]);
    evidence.push({
      scenario: 'network loss with no visible result never authorizes a second mutation',
      passed: true,
      providerMutations: 1,
    });
  }
  {
    stage = 'refund-race';
    const st = await fixture();
    complete(st);
    await one.call('settle', st.id);
    const [cap] = await local`select id from ce_paypal_captures where operation_id=${st.id}`;
    const hold = gate();
    st.holdRefund = hold.promise;
    const refund = one.call('refund', st.id, {
      captureId: cap.id,
      cents: 700,
      clientKey: 'race-a',
    });
    await until(() => st.refundMutations === 1);
    assert.equal(
      (await two.call('refund', st.id, { captureId: cap.id, cents: 700, clientKey: 'race-b' }))
        .status,
      409,
    );
    hold.release();
    assert.equal((await refund).error, undefined);
    assert.equal(
      (await two.call('refund', st.id, { captureId: cap.id, cents: 700, clientKey: 'race-a' }))
        .error,
      undefined,
    );
    assert.equal(st.refundMutations, 1);
    evidence.push({
      scenario: 'independent refund workers reserve balance and deduplicate identity',
      passed: true,
      providerMutations: 1,
    });
  }
  {
    stage = 'refund-process-crash';
    const st = await fixture();
    complete(st);
    await one.call('settle', st.id);
    const [cap] = await local`select id from ce_paypal_captures where operation_id=${st.id}`;
    const hold = gate();
    st.holdRefund = hold.promise;
    const lost = one
      .call('refund', st.id, { captureId: cap.id, cents: 1000, clientKey: 'crash-refund' })
      .catch(() => ({ interrupted: true }));
    await until(() => st.refundMutations === 1);
    one.child.kill('SIGKILL');
    await lost;
    hold.release();
    assert.equal((await two.call('settle', st.id)).error, undefined);
    const [r] =
      await local`select status,verified_at from ce_refund_operations where capture_id=${cap.id}`;
    assert.equal(r.status, 'COMPLETED');
    assert(r.verified_at);
    await two.call('refund', st.id, { captureId: cap.id, cents: 1000, clientKey: 'crash-refund' });
    assert.equal(st.refundMutations, 1);
    evidence.push({
      scenario: 'refund process killed after mutation; custom identity recovers lost provider ID',
      passed: true,
      providerMutations: 1,
    });
  }
  assert([...states.values()].every((st) => st.keys.every((k) => k.length <= 38)));
  const report = {
    checkedAt: new Date().toISOString(),
    provider: 'controlled local fake; no PayPal mutations',
    database: 'existing dedicated PostgreSQL; isolated temporary schema',
    independentProcesses: true,
    scenarios: evidence,
    totalScenarios: evidence.length,
  };
  await writeFile(
    'docs/financial-concurrency-evidence.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(report);
} catch (e) {
  console.error(
    e instanceof assert.AssertionError
      ? { failure: 'Concurrency assertion', actual: e.actual, expected: e.expected }
      : {
          failure: 'Concurrency harness failed; no PayPal mutations',
          stage,
          code: typeof e === 'object' && e && 'code' in e ? e.code : undefined,
          message:
            e instanceof Error
              ? e.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')
              : undefined,
        },
  );
  process.exitCode = 1;
} finally {
  for (const w of workers)
    if (!w.child.killed) {
      w.child.kill('SIGTERM');
    }
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await local.end();
  if (created)
    try {
      await admin.unsafe(`DROP SCHEMA \"${schema}\" CASCADE`);
    } catch {
      console.error('Temporary schema cleanup requires a later retry.');
    }
  await admin.end();
}
