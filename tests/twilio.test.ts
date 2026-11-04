import { describe, it, expect } from 'vitest';
import twilio from 'twilio';
import { verifyTwilio } from '../src/server/integrations/twilio';
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
