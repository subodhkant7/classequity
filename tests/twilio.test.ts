import { describe, it, expect } from 'vitest';
import twilio from 'twilio';
import { verifyTwilio, whatsappStatusCallback } from '../src/server/integrations/twilio';
describe('Twilio webhook authentication', () => {
  it('accepts an authentic signature over exact URL and form parameters', () => {
    const token = 'synthetic-test-token',
      url = 'https://school.example.test/api/webhooks/twilio',
      params = {
        From: 'whatsapp:+15550100023',
        Body: 'Group price?',
        MessageSid: 'SM00000000000000000000000000000000',
      };
    const signature = twilio.getExpectedTwilioSignature(token, url, params);
    expect(verifyTwilio(signature, url, params, token)).toBe(true);
    expect(verifyTwilio(signature, url, { ...params, Body: 'changed' }, token)).toBe(false);
    expect(verifyTwilio(signature, url + '/', params, token)).toBe(false);
    expect(verifyTwilio('', url, params, token)).toBe(false);
  });
});

describe('Twilio outbound callback address', () => {
  it('omits a loopback callback for a local Sandbox send', () => {
    expect(whatsappStatusCallback('http://localhost:3210')).toBeUndefined();
    expect(whatsappStatusCallback('https://127.0.0.1:3210')).toBeUndefined();
  });

  it('uses the canonical HTTPS path with or without a trailing slash', () => {
    for (const origin of ['https://school.example.test', 'https://school.example.test/']) {
      expect(whatsappStatusCallback(origin)).toBe(
        'https://school.example.test/api/webhooks/twilio/status',
      );
    }
  });
});
