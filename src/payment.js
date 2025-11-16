import { query } from '@anthropic-ai/claude-agent-sdk';
import { getMcpOptions } from './config.js';

export async function sendPayment({ to, amount, memo }) {
  const options = getMcpOptions();
  const prompt = `Send ${amount} USDC to address ${to} with memo "${memo}"`;

  let paymentResult = null;

  for await (const message of query({ prompt, options })) {
    if (message.type === 'result' && message.subtype === 'success') {
      paymentResult = message.result;
    }
  }

  if (!paymentResult) {
    throw new Error('Payment result was not received from Locus');
  }

  return {
    success: true,
    result: paymentResult
  };
}
