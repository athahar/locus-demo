import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Wallet addresses for testing payments
const SENDER_ADDRESS = '0xe68a976548be38257043efdd97af89249b2a49dd';
const RECEIVER_ADDRESS = '0x4ae934efc1b61b3686394ffcf8c4a6a3780b7cb9';

async function main() {
  try {
    console.log('🎯 Starting Locus Claude SDK application...\n');

    // 1. Configure MCP connection to Locus
    console.log('Configuring Locus MCP connection...');
    const mcpServers = {
      'locus': {
        type: 'http',
        url: 'https://mcp.paywithlocus.com/mcp',
        headers: {
          'Authorization': `Bearer ${process.env.LOCUS_API_KEY}`
        }
      }
    };

    const options = {
      mcpServers,
      allowedTools: [
        'mcp__locus__*',      // Allow all Locus tools
        'mcp__list_resources',
        'mcp__read_resource'
      ],
      apiKey: process.env.ANTHROPIC_API_KEY,
      // Auto-approve Locus tool usage
      canUseTool: async (toolName, input) => {
        if (toolName.startsWith('mcp__locus__')) {
          return {
            behavior: 'allow',
            updatedInput: input
          };
        }
        return {
          behavior: 'deny',
          message: 'Only Locus tools are allowed'
        };
      }
    };

    console.log('✓ MCP configured\n');

    // // 2. Run a query that uses MCP tools
    // console.log('Running sample query...\n');
    // console.log('─'.repeat(50));

    // let mcpStatus = null;
    // let finalResult = null;

    // for await (const message of query({
    //   prompt: 'What tools are available from Locus? Please list them.',
    //   options
    // })) {
    //   if (message.type === 'system' && message.subtype === 'init') {
    //     // Check MCP connection status
    //     const mcpServersInfo = message.mcp_servers;
    //     mcpStatus = mcpServersInfo?.find(s => s.name === 'locus');
    //     if (mcpStatus?.status === 'connected') {
    //       console.log(`✓ Connected to Locus MCP server\n`);
    //     } else {
    //       console.warn(`⚠️  MCP connection issue\n`);
    //     }
    //   } else if (message.type === 'result' && message.subtype === 'success') {
    //     finalResult = message.result;
    //   }
    // }

    // console.log('Response:', finalResult);
    // console.log('─'.repeat(50));
    // console.log('\n✓ Query completed successfully!');

    // // 3. Get payment context
    // console.log('\n\nGetting payment context...\n');
    // console.log('─'.repeat(50));

    // let paymentContext = null;

    // for await (const message of query({
    //   prompt: 'What is my payment context? Please get my budget status and whitelisted contacts.',
    //   options
    // })) {
    //   if (message.type === 'result' && message.subtype === 'success') {
    //     paymentContext = message.result;
    //   }
    // }

    // console.log('Payment Context:', paymentContext);
    // console.log('─'.repeat(50));
    // console.log('\n✓ Payment context retrieved successfully!');

    // 3. Get payment context first
    console.log('\n\nGetting payment context...\n');
    console.log('─'.repeat(50));

    let paymentContext = null;

    for await (const message of query({
      prompt: 'What is my payment context? Please get my budget status and whitelisted contacts.',
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        paymentContext = message.result;
      }
    }

    console.log('Payment Context:', paymentContext);
    console.log('─'.repeat(50));
    console.log('\n✓ Payment context retrieved successfully!');

    // 4. Send payment
    console.log('\n\nSending payment...\n');
    console.log('─'.repeat(50));

    let paymentResult = null;

    for await (const message of query({
      prompt: `Send 0.01 USDC to address ${RECEIVER_ADDRESS} with memo "Test payment"`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        paymentResult = message.result;
      }
    }

    console.log('Payment Result:', paymentResult);
    console.log('─'.repeat(50));
    console.log('\n✓ Payment sent successfully!');
    

    console.log('\n🚀 Your Locus application is working!');
    console.log('\nNext steps:');
    console.log('  • Modify the prompt in index.js to use Locus tools');
    console.log('  • Try asking Claude to send USDC to an address or email');
    console.log('  • Explore MCP resources and capabilities\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  • Your .env file contains valid credentials');
    console.error('  • Your network connection is active');
    console.error('  • Your Locus and Anthropic API keys are correct\n');
    process.exit(1);
  }
}

main();
