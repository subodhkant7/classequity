import { describe, it, expect } from 'vitest';
import { validateHostedConfig, providerAiAllowed } from '../src/lib/hosted-config';
import { paypalEventKind, paypalWebhookEvents } from '../src/lib/paypal-webhook-events';

const configured = {
  APP_URL: 'https://fictional-release.example.test',
  DATABASE_URL: 'postgres://synthetic:synthetic@localhost/classequity',
  SESSION_SECRET: 'synthetic-session-at-least-32-characters',
  ADMIN_PASSWORD: 'synthetic-test-password-only',
  PAYPAL_ENV: 'sandbox',
  DEMO_MODE: 'true',
  HOSTED_RESTRICT_PUBLIC_AI: 'true',
  PAYPAL_CLIENT_ID: 'synthetic-client',
  PAYPAL_CLIENT_SECRET: 'synthetic-secret',
  GEMINI_API_KEY: 'synthetic-key',
};
describe('hosted release boundary', () => {
  it('accepts the dedicated sandbox configuration without requiring a webhook before registration', () => {
    expect(() => validateHostedConfig(configured)).not.toThrow();
  });
  it.each([
    { PAYPAL_ENV: 'live' },
    { APP_URL: 'http://example.test' },
    { APP_URL: 'https://example.test/path' },
    { DATABASE_URL: 'postgres://localhost/other' },
    { SESSION_SECRET: 'short' },
    { ADMIN_PASSWORD: '' },
    { CE_TEST_SCHEMA: 'ce_verify_test' },
    { CE_PREVIEW_ISOLATED: 'true' },
    { LOCAL_DATABASE_DIR: '.data/test' },
    { HOSTED_RESTRICT_PUBLIC_AI: 'false' },
  ])('refuses an unsafe hosted override %j', (override) => {
    expect(() => validateHostedConfig({ ...configured, ...override })).toThrow();
  });
  it('recognizes the exact supported financial vocabulary and retains future financial events for review', () => {
    for (const type of paypalWebhookEvents) expect(paypalEventKind(type)).toBe('supported');
    expect(paypalEventKind('PAYMENT.CAPTURE.FUTURE')).toBe('unsupported-financial');
    expect(paypalEventKind('CHECKOUT.ORDER.FUTURE')).toBe('unsupported-financial');
    expect(paypalEventKind('BILLING.SUBSCRIPTION.CREATED')).toBe('unrelated');
  });
  it('keeps hosted public demo roles away from cloud AI while retaining restricted sandbox AI', () => {
    expect(providerAiAllowed('demo', configured)).toBe(false);
    expect(providerAiAllowed('sandbox', configured)).toBe(true);
    expect(providerAiAllowed('demo', {})).toBe(true);
  });
});
