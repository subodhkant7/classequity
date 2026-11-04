import twilio from 'twilio';
import { AppError } from '../errors';
export function verifyTwilio(
  signature: string,
  url: string,
  params: Record<string, string>,
  token = process.env.TWILIO_AUTH_TOKEN || '',
) {
  return Boolean(token && signature) && twilio.validateRequest(token, signature, url, params);
}
export async function sendWhatsapp(to: string, body: string) {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_WHATSAPP_FROM
  )
    throw new AppError('Twilio WhatsApp is not configured.', 503);
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, {
      autoRetry: false,
      timeout: 15000,
    });
    return await client.messages.create({
      to,
      from: process.env.TWILIO_WHATSAPP_FROM,
      body,
      statusCallback: `${process.env.APP_URL}/api/webhooks/twilio/status`,
    });
  } catch (e) {
    const code = typeof e === 'object' && e && 'code' in e ? String(e.code) : 'UNKNOWN';
    throw new AppError(
      `WhatsApp delivery could not be confirmed (${code}). Inspect the message status before resending.`,
      502,
      code,
    );
  }
}
export function twiml(body: string) {
  const message = new twilio.twiml.MessagingResponse();
  message.message(body);
  return message.toString();
}
