export function validateHostedConfig(env: Record<string, string | undefined>) {
  const required = [
    'APP_URL',
    'DATABASE_URL',
    'SESSION_SECRET',
    'ADMIN_PASSWORD',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'GEMINI_API_KEY',
  ];
  if (required.some((key) => !env[key])) throw Error('Required hosted configuration is missing.');
  const app = new URL(env.APP_URL!);
  const database = new URL(env.DATABASE_URL!);
  if (
    app.protocol !== 'https:' ||
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== '/'
  )
    throw Error('APP_URL must be the canonical HTTPS origin.');
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    database.pathname !== '/classequity'
  )
    throw Error('The dedicated classequity PostgreSQL database is required.');
  if (env.SESSION_SECRET!.length < 32 || env.ADMIN_PASSWORD!.length < 16)
    throw Error('Hosted authentication configuration is incomplete.');
  if (
    env.PAYPAL_ENV !== 'sandbox' ||
    env.DEMO_MODE !== 'true' ||
    env.HOSTED_RESTRICT_PUBLIC_AI !== 'true'
  )
    throw Error('This release supports sandbox payments and the interactive demo workspace only.');
  if (env.CE_TEST_SCHEMA || env.CE_PREVIEW_ISOLATED === 'true' || env.LOCAL_DATABASE_DIR)
    throw Error('Local test overrides cannot be used for the hosted service.');
}

export function providerAiAllowed(
  mode: string,
  env: Record<string, string | undefined> = process.env,
) {
  return env.HOSTED_RESTRICT_PUBLIC_AI !== 'true' || mode === 'sandbox';
}
