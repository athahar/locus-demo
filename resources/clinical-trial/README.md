# Clinical Trial Site Selection Research Scenario

## Overview

This is a complete, production-ready research marketplace scenario demonstrating how AI agents can negotiate and transact for premium research data using blockchain payments.

**Scenario**: A pharmaceutical company needs to select 3 optimal sites for a Phase III oncology trial. The buyer agent negotiates with 3 expert sellers (McKinsey, Deloitte, Stanford) offering complementary research data at tiered pricing.

**Key Features**:
- ✅ Realistic research question with real-world data
- ✅ Tiered pricing (excerpts vs full reports)
- ✅ Built-in negotiation dynamics
- ✅ Data-driven decision making
- ✅ Blockchain payment integration
- ✅ 10-15 minute demo duration

---

## Files Included

```
resources/clinical-trial/
├── README.md (this file)
├── clinical-trial-config.js         # Complete scenario configuration
├── prompts/
│   ├── buyer-prompt.txt              # Buyer agent system prompt
│   ├── seller-mckinsey-prompt.txt    # McKinsey (Demographics) seller prompt
│   ├── seller-deloitte-prompt.txt    # Deloitte (Compliance) seller prompt
│   └── seller-stanford-prompt.txt    # Stanford (Enrollment) seller prompt
├── excerpts/
│   ├── mckinsey-demographics-excerpt.txt   # Patient demographics data
│   ├── deloitte-compliance-excerpt.txt     # FDA compliance data
│   └── stanford-enrollment-excerpt.txt     # Enrollment performance data
└── [PDFs you already have]
```

---

## Scenario Details

### Research Question
**"Which 3 sites should host our Phase III oncology trial?"**

### Buyer Agent
- **Name**: Dr. Sarah Mitchell
- **Company**: BioTech Innovations Corp
- **Role**: Research Director
- **Budget**: $0.20 USDC
- **Trial**: Phase III triple-negative breast cancer, 200 patients, 18-month enrollment

### Seller Agents

#### Seller A: McKinsey & Company (Patient Demographics)
- **Expert**: Dr. James Chen, Senior Partner
- **Expertise**: Patient population demographics, site feasibility analysis
- **Offerings**:
  - **Executive Summary** (5 pages): **$0.01** - Top 10 sites + 2 detailed profiles
  - **Full Report** (62 pages): **$0.04** - All 50 sites with complete data

#### Seller B: Deloitte Life Sciences (Regulatory Compliance)
- **Expert**: Rebecca Martinez, Principal (Former FDA officer)
- **Expertise**: FDA inspection history, GCP compliance, regulatory risk
- **Offerings**:
  - **Compliance Scorecard** (8 pages): **$0.01** - 15 sites with scores + red flags
  - **Full Report** (89 pages): **$0.05** - All 45 sites with 5-year FDA history

#### Seller C: Stanford Center for Clinical Research (Enrollment Performance)
- **Expert**: Dr. Priya Sharma, PhD (Director, Clinical Trials Optimization Lab)
- **Expertise**: Enrollment benchmarks, site performance, predictive models
- **Offerings**:
  - **Key Findings** (12 pages): **$0.02** - Industry benchmarks + top 8 elite sites
  - **Full Report** (124 pages): **$0.09** - All 60 sites + predictive models

---

## Expected Demo Flow

### Phase 1: Introduction (2-3 min)
**Buyer**:
1. Introduces themselves and trial parameters
2. Lists 5-7 candidate sites from public knowledge (e.g., "I know Johns Hopkins, Mayo Clinic, MD Anderson are reputable...")
3. Identifies gaps: "But I don't know which have sufficient TNBC patient volume, clean FDA records, or fast enrollment rates"

**Sellers**: Listen and prepare pitches

### Phase 2: Seller Pitches (3-4 min)
**McKinsey**: "I can tell you which sites have the TNBC patient volume you need. My report covers the top 50 cancer centers with demographic breakdowns..."

**Deloitte**: "Regulatory compliance is your biggest risk. One FDA warning letter can delay approval by 6-12 months. I have 5-year FDA inspection data..."

**Stanford**: "85% of trials miss enrollment targets. I have benchmarks showing which sites actually deliver on enrollment commitments..."

**Buyer**: Asks clarifying questions:
- "Does your excerpt cover Johns Hopkins?"
- "How recent is your FDA data?"
- "Can I get just the top 10 sites instead of all 50?"

### Phase 3: Negotiation (3-4 min)
**Expected Negotiations**:
- Buyer: "McKinsey, can I get a custom excerpt for just 10 sites at $0.02 instead of $0.04 for all 50?"
- McKinsey: "I can do that - which 10 sites are you most interested in?"
- Buyer: "Deloitte, your scorecard is $0.01 same as McKinsey. If I buy both, can you bundle at $0.009 each?"
- Deloitte: "Yes, if you commit to both I'll do $0.009"

**Typical Purchases**:
- McKinsey Executive Summary: **$0.01**
- Deloitte Full Report: **$0.05** (compliance is highest priority)
- Stanford Key Findings: **$0.02**
- **Total: $0.08** (under $0.20 budget)

### Phase 4: Analysis & Recommendation (2-3 min)
**Buyer synthesizes data**:

```
RECOMMENDATION: Phase III Oncology Trial Site Selection

SELECTED SITES:
1. Johns Hopkins Sidney Kimmel Cancer Center (Baltimore, MD)
   - Patient Volume: 210 TNBC patients/year (McKinsey)
   - FDA Compliance: 100/100 score, perfect NAI record (Deloitte)
   - Enrollment Rate: 2.8 patients/month (Stanford elite performer)
   - Rationale: Perfect trifecta - volume, compliance, speed

2. Dana-Farber Cancer Institute (Boston, MA)
   - Patient Volume: 192 TNBC patients/year
   - FDA Compliance: 100/100 score, gold standard
   - Enrollment Rate: 2.6 pt/mo + 91% retention (highest)
   - Rationale: Northeast diversity + best-in-class retention

3. UCSF Helen Diller Comprehensive Cancer Center (San Francisco, CA)
   - Patient Volume: 156 TNBC patients/year
   - FDA Compliance: 100/100 score
   - Enrollment Rate: 2.4 pt/mo, 54% minority diversity
   - Rationale: West Coast coverage + highest diversity (FDA requirement)

RESEARCH INVESTMENT: $0.08 ($0.12 under budget)
CONFIDENCE LEVEL: High
```

---

## Integration Instructions

### Step 1: Load System Prompts

When initializing agents, load the appropriate system prompt:

```javascript
import { readFileSync } from 'fs';
import config from './resources/clinical-trial/clinical-trial-config.js';

// Load buyer prompt
const buyerPrompt = readFileSync(config.BUYER_AGENT.promptFile, 'utf-8');

// Load seller prompts
const mcKinseyPrompt = readFileSync(
  config.SELLER_AGENTS.find(s => s.id === 'seller-mckinsey').promptFile,
  'utf-8'
);
const deloittePrompt = readFileSync(
  config.SELLER_AGENTS.find(s => s.id === 'seller-deloitte').promptFile,
  'utf-8'
);
const stanfordPrompt = readFileSync(
  config.SELLER_AGENTS.find(s => s.id === 'seller-stanford').promptFile,
  'utf-8'
);
```

### Step 2: Initialize Agents with Claude API

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Buyer agent
const buyerAgent = {
  id: 'buyer',
  systemPrompt: buyerPrompt,
  conversationHistory: [],
};

// Seller agents
const sellerAgents = [
  { id: 'mckinsey', systemPrompt: mcKinseyPrompt, conversationHistory: [] },
  { id: 'deloitte', systemPrompt: deloittePrompt, conversationHistory: [] },
  { id: 'stanford', systemPrompt: stanfordPrompt, conversationHistory: [] },
];
```

### Step 3: Handle Content Delivery After Purchase

When a buyer purchases data:

```javascript
async function handlePurchase(sellerId, offeringId, paymentTxHash) {
  // 1. Verify blockchain transaction
  const txVerified = await verifyTransaction(paymentTxHash);
  if (!txVerified) {
    throw new Error('Payment not verified');
  }

  // 2. Get content file path
  const offering = config.getOffering(sellerId, offeringId);
  const content = await config.loadContent(offering.contentFile);

  // 3. Deliver content to buyer
  return {
    success: true,
    message: `Transaction confirmed. I'm now sharing the ${offering.title} with you.`,
    content: content, // Full text from excerpt file
    metadata: {
      seller: sellerId,
      offering: offeringId,
      price: offering.price,
      txHash: paymentTxHash,
    }
  };
}
```

### Step 4: Conversation Flow

```javascript
// Single-thread UI approach (all agents in one conversation)
async function runConversation() {
  const messages = [];

  // 1. Buyer introduces themselves
  const buyerIntro = await generateAgentResponse(buyerAgent, messages);
  messages.push({ role: 'buyer', content: buyerIntro });

  // 2. Sellers respond with pitches
  for (const seller of sellerAgents) {
    const pitch = await generateAgentResponse(seller, messages);
    messages.push({ role: seller.id, content: pitch });
  }

  // 3. Continue conversation loop with negotiation
  while (!negotiationComplete) {
    // Get buyer response
    const buyerMsg = await generateAgentResponse(buyerAgent, messages);
    messages.push({ role: 'buyer', content: buyerMsg });

    // Detect if buyer wants to purchase
    if (detectPurchaseIntent(buyerMsg)) {
      const purchase = await handlePurchase(...);
      messages.push({ role: 'system', content: purchase.message + '\n\n' + purchase.content });
    }

    // Get relevant seller responses
    // ... (continue loop)
  }

  // 4. Buyer delivers final recommendation
  const recommendation = await generateAgentResponse(buyerAgent, messages);
  messages.push({ role: 'buyer', content: recommendation });

  return messages;
}
```

### Step 5: Agent Response Generation

```javascript
async function generateAgentResponse(agent, conversationHistory) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: agent.systemPrompt,
    messages: conversationHistory.map(msg => ({
      role: msg.role === 'buyer' ? 'user' : 'assistant',
      content: msg.content
    }))
  });

  return response.content[0].text;
}
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key

# Blockchain Wallets (Private Keys)
BUYER_WALLET_PRIVATE_KEY=0x...
SELLER_MCKINSEY_PRIVATE_KEY=0x...
SELLER_DELOITTE_PRIVATE_KEY=0x...
SELLER_STANFORD_PRIVATE_KEY=0x...

# Smart Contract
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia USDC
```

---

## Customization Guide

### Adjusting Pricing
Edit `clinical-trial-config.js`:

```javascript
offerings: [
  {
    price: 0.01, // Change to your desired price
    // ...
  }
]
```

### Changing Seller Personalities
Edit the seller prompt files:
- Make McKinsey more aggressive → Edit negotiation section
- Make Deloitte more flexible → Adjust "RESIST" pricing
- Make Stanford more academic → Add more research citations

### Adding New Sellers
1. Create new prompt file in `prompts/`
2. Create new excerpt file in `excerpts/`
3. Add seller config to `clinical-trial-config.js`:

```javascript
{
  id: "seller-newco",
  name: "Dr. New Expert",
  company: "New Company",
  expertise: "New Specialty",
  promptFile: "resources/clinical-trial/prompts/seller-newco-prompt.txt",
  offerings: [
    // ...
  ]
}
```

### Modifying Research Question
Edit `buyer-prompt.txt`:
- Change indication (e.g., lung cancer instead of breast cancer)
- Change trial phase (e.g., Phase II instead of Phase III)
- Adjust budget, enrollment targets, timeline

---

## Testing Checklist

Before going live:

- [ ] Load all prompt files successfully
- [ ] Load all excerpt files successfully
- [ ] Test wallet connections (buyer + 3 sellers)
- [ ] Verify USDC contract address (Base Sepolia testnet)
- [ ] Run end-to-end conversation flow
- [ ] Test purchase transaction flow
- [ ] Verify content delivery after purchase
- [ ] Test negotiation scenarios (buyer asks for discounts)
- [ ] Ensure buyer stays within $0.20 budget
- [ ] Validate final recommendation includes all 3 sites

---

## Expected Success Metrics

**Successful Demo Indicators**:
- ✅ Buyer clearly articulates research question and gaps
- ✅ All 3 sellers pitch their unique value propositions
- ✅ At least 2 negotiation exchanges occur
- ✅ Buyer purchases 2-3 data products (total $0.05-$0.12)
- ✅ Buyer delivers data-driven recommendation with justification
- ✅ Total conversation: 10-15 minutes
- ✅ Blockchain transactions complete successfully

**Red Flags**:
- ❌ Buyer purchases all full reports (over-budget, unrealistic)
- ❌ Buyer doesn't negotiate (no price sensitivity)
- ❌ Sellers give away content before purchase
- ❌ Recommendation doesn't cite purchased data sources
- ❌ Conversation exceeds 20 minutes (too slow)

---

## Troubleshooting

### Issue: Agents talk past each other
**Solution**: Ensure conversation history includes all messages from all agents. Agents should "see" what others have said.

### Issue: Buyer buys everything / goes over budget
**Solution**: Buyer prompt includes budget constraint. Reinforce in system prompt: "You MUST stay within $0.20"

### Issue: Sellers give content away for free
**Solution**: Seller prompts clearly state "ONLY share document content AFTER purchase". Emphasize this rule.

### Issue: No negotiation happens
**Solution**: Buyer prompt includes explicit negotiation examples. Sellers have flexible pricing. If still no negotiation, adjust buyer to be more budget-conscious.

### Issue: Recommendation is generic, not data-driven
**Solution**: After buyer purchases data, ensure the full excerpt content is added to conversation history. Buyer should reference specific data points (e.g., "According to Deloitte's scorecard, Johns Hopkins has a 100/100 compliance score...")

---

## FAQ

**Q: Can I use real PDFs instead of text excerpts?**
A: Yes! You already have 4 PDFs in the `resources/clinical-trial/` folder. You can either:
1. Use PDF parsing libraries to extract text and send to agents
2. Reference PDFs by name in agent conversations (agents describe content without seeing full PDF)

**Q: How do I handle the "full report" if buyer purchases it?**
A: Two options:
1. **Simulate**: Send the excerpt content + a message "Full report includes additional 48 sites and detailed appendices"
2. **Actually provide**: Create extended versions of excerpt files with more data

**Q: Can sellers collaborate or bundle their offerings?**
A: Yes! Seller prompts include cross-sell language. Example: McKinsey can say "If you buy my summary and Deloitte's scorecard together, I'll do $0.009 instead of $0.01"

**Q: What if buyer tries to negotiate below minimum prices?**
A: Seller prompts have hard minimum prices (e.g., McKinsey won't go below $0.008 for excerpt). Sellers will politely decline and offer alternatives (free consultation, bundling, etc.)

**Q: How do I make the demo shorter (5-7 minutes)?**
A:
- Start buyer with a shortlist of 3-5 sites (less exploration)
- Have sellers pre-loaded in conversation (skip intros)
- Buyer purchases faster (less negotiation back-and-forth)

---

## Support & Feedback

For questions or issues with this scenario:
- Review the prompt files - they contain extensive guidance
- Check `clinical-trial-config.js` for all configuration options
- Ensure all environment variables are set correctly

---

## Credits

**Research Data Sources**:
- Patient demographics: Based on NCI SEER data, HCUP hospital discharge records
- FDA compliance: Based on FDA Inspection Classification Database, publicly available Form 483s
- Enrollment benchmarks: Based on ClinicalTrials.gov registry data and published academic research

**Prompts & Scenario Design**: Designed for realistic AI agent negotiation and research marketplace demonstration

---

## Version History

- **v1.0** (Current): Initial release with 3 sellers, tiered pricing, realistic data excerpts

---

**Ready to run!** Import `clinical-trial-config.js` into your application and follow the integration instructions above.
