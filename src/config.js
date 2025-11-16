import 'dotenv/config';

export const SENDER_ADDRESS = '0xe68a976548be38257043efdd97af89249b2a49dd';
export const RECEIVER_ADDRESS = '0x4ae934efc1b61b3686394ffcf8c4a6a3780b7cb9';
export const PDF_LINK = 'https://research.tilburguniversity.edu/files/51558956/Labour_Law_Interactive_PDF_03_07_2021.pdf';
export const PAYMENT_AMOUNT = 0.01; // legacy scripted flow amount

export const MIN_PRICE = 0.01;
export const MAX_PRICE = 0.10;
export const BUYER_LIMIT = 0.05;
export const SELLER_START_MIN = 0.06;
export const SELLER_START_MAX = 0.10;
export const NEGOTIATION_MAX_TURNS = 3;

export const PDF_EXTRACTS = {
  liability_mistakes: {
    keywords: ['liability for mistakes', 'mistakes by the workers'],
    excerpt: `2.13. Liability for mistakes by the workers
Like in Europe also in the USA the main rule is: the employer is most of the times liable for damages resulting from mistakes made by his employees in the course of their employment (respondeat superior). Besides that, also the worker is liable for his own misconduct even though he is acting while in the course of his employment and at the specific directions of his employer.

There are no Federal rules in this field. The limitations and the exceptions of this principle vary somewhat from one State to the other because this is all judge-made common law!`
  }
};

export function getMcpOptions() {
  const locusApiKey = process.env.LOCUS_API_KEY;
  if (!locusApiKey) {
    throw new Error('Missing LOCUS_API_KEY in environment');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY in environment');
  }

  const mcpServers = {
    locus: {
      type: 'http',
      url: 'https://mcp.paywithlocus.com/mcp',
      headers: {
        Authorization: `Bearer ${locusApiKey}`
      }
    }
  };

  return {
    mcpServers,
    allowedTools: ['mcp__locus__*', 'mcp__list_resources', 'mcp__read_resource'],
    apiKey: process.env.ANTHROPIC_API_KEY,
    canUseTool: async (toolName, input) => {
      if (toolName.startsWith('mcp__locus__send_to_address')) {
        const amount = typeof input?.amount === 'number' ? input.amount : parseFloat(input?.amount ?? '0');
        if (amount > BUYER_LIMIT) {
          return {
            behavior: 'deny',
            message: `Amount ${amount} exceeds buyer limit of ${BUYER_LIMIT} USDC`
          };
        }
      }

      if (toolName.startsWith('mcp__locus__')) {
        return { behavior: 'allow', updatedInput: input };
      }

      return { behavior: 'deny', message: 'Only Locus tools are allowed' };
    }
    // TODO: evaluate Locus platform spending policies for stronger enforcement
  };
}
