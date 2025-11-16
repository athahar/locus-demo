/**
 * CLINICAL TRIAL SITE SELECTION SCENARIO CONFIGURATION
 *
 * This file contains the complete configuration for the clinical trial
 * research marketplace demo, including buyer/seller details, pricing,
 * wallet addresses, and content mappings.
 */

// ============================================================================
// SCENARIO OVERVIEW
// ============================================================================

export const SCENARIO_INFO = {
  name: "Phase III Oncology Clinical Trial Site Selection",
  description: "Pharmaceutical company researching optimal sites for a Phase III triple-negative breast cancer trial",
  researchQuestion: "Which 3 sites should host our Phase III oncology trial?",
  estimatedDuration: "10-15 minutes",
  totalBudget: 0.20, // USDC
  expectedOutcome: "Data-driven recommendation of 3 optimal trial sites"
};

// ============================================================================
// BUYER CONFIGURATION
// ============================================================================

export const BUYER_AGENT = {
  id: "buyer-pharma",
  name: "Dr. Sarah Mitchell",
  company: "BioTech Innovations Corp",
  role: "Research Director",

  // System prompt location
  promptFile: "resources/clinical-trial/prompts/buyer-prompt.txt",

  // Buyer's blockchain wallet
  wallet: {
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Replace with actual buyer wallet
    privateKey: process.env.BUYER_WALLET_PRIVATE_KEY, // Store in .env
  },

  // Research parameters
  research: {
    question: "Which 3 sites should host our Phase III oncology trial?",
    trialType: "Phase III, multicenter, randomized controlled",
    indication: "Triple-negative breast cancer (stages II-III)",
    targetEnrollment: 200,
    timeline: "18-month enrollment, 24-month follow-up",
    budget: 0.20, // USDC for research data
  },

  // Decision criteria (used in prompt)
  decisionCriteria: [
    { name: "Patient Demographics", weight: 35, description: "Patient volume, diversity, accessibility" },
    { name: "Regulatory Compliance", weight: 40, description: "FDA inspection history, GCP compliance" },
    { name: "Enrollment Performance", weight: 25, description: "Historical enrollment rates, retention" }
  ]
};

// ============================================================================
// SELLER CONFIGURATIONS
// ============================================================================

export const SELLER_AGENTS = [
  // SELLER A: McKinsey & Company
  {
    id: "seller-mckinsey",
    name: "Dr. James Chen",
    company: "McKinsey & Company",
    title: "Senior Partner, Healthcare Systems & Services",
    expertise: "Patient Population Demographics",

    // System prompt location
    promptFile: "resources/clinical-trial/prompts/seller-mckinsey-prompt.txt",

    // Seller's blockchain wallet
    wallet: {
      address: "0x4ae9340563e5d614a7a1f9c06d6796f5a17dcc7e", // Replace with actual wallet
      privateKey: process.env.SELLER_MCKINSEY_PRIVATE_KEY, // Store in .env
    },

    // Products offered
    offerings: [
      {
        id: "mckinsey-excerpt",
        type: "excerpt",
        title: "Executive Summary - Patient Demographics",
        description: "Top 10 sites ranked + 2 detailed profiles (MSK, MD Anderson). 5 pages.",
        price: 0.01, // USDC
        contentFile: "resources/clinical-trial/excerpts/mckinsey-demographics-excerpt.txt",
        pages: 5,
        coverage: "Top 10 oncology sites",
        keyInsights: [
          "Top 10 site rankings by trial suitability score",
          "Patient volume by cancer subtype (including TNBC)",
          "Demographic diversity indices",
          "Detailed profiles: Memorial Sloan Kettering & MD Anderson"
        ]
      },
      {
        id: "mckinsey-full",
        type: "full",
        title: "Full Report - Patient Demographics (All 50 Sites)",
        description: "Comprehensive analysis of 50 major U.S. cancer centers. 62 pages.",
        price: 0.04, // USDC
        contentFile: "resources/clinical-trial/excerpts/mckinsey-demographics-excerpt.txt", // In demo, simulate by adding "Full report includes..."
        pages: 62,
        coverage: "All 50 major U.S. cancer centers",
        keyInsights: [
          "All 50 sites with complete demographic data",
          "Cancer subtype-specific breakdowns (HER2+, TNBC, etc.)",
          "Geographic heat maps showing patient density",
          "Competitive trial landscape analysis"
        ]
      }
    ],

    // Negotiation parameters
    negotiation: {
      minPriceExcerpt: 0.008, // Won't go below 20% discount
      minPriceFull: 0.03,     // Won't go below 25% discount
      bundleDiscount: 0.10,   // 10% off if buyer bundles with other sellers
      customExcerptPrice: 0.02, // Custom excerpt for specific sites
    }
  },

  // SELLER B: Deloitte Life Sciences
  {
    id: "seller-deloitte",
    name: "Rebecca Martinez",
    company: "Deloitte Consulting LLP",
    title: "Principal, Life Sciences & Health Care",
    expertise: "Regulatory Compliance & FDA Inspection Analysis",

    // System prompt location
    promptFile: "resources/clinical-trial/prompts/seller-deloitte-prompt.txt",

    // Seller's blockchain wallet
    wallet: {
      address: "0x0068dc50993aca3a56d45a95200e8337adf593ec", // Replace with actual wallet
      privateKey: process.env.SELLER_DELOITTE_PRIVATE_KEY, // Store in .env
    },

    // Products offered
    offerings: [
      {
        id: "deloitte-scorecard",
        type: "excerpt",
        title: "Compliance Scorecard - 15 Top Sites",
        description: "Compliance scores, FDA inspection outcomes, top 5 'gold standard' sites + 3 red flags. 8 pages.",
        price: 0.01, // USDC
        contentFile: "resources/clinical-trial/excerpts/deloitte-compliance-excerpt.txt",
        pages: 8,
        coverage: "15 top-tier clinical research sites",
        keyInsights: [
          "Compliance scores (0-100 scale) for 15 sites",
          "FDA inspection classifications (NAI/VAI/OAI)",
          "5 'gold standard' sites with perfect records",
          "3 sites with red flags to avoid"
        ]
      },
      {
        id: "deloitte-full",
        type: "full",
        title: "Full Compliance Report - 45 Sites, 5-Year Analysis",
        description: "Comprehensive FDA inspection history, Form 483 details, remediation timelines. 89 pages.",
        price: 0.05, // USDC
        contentFile: "resources/clinical-trial/excerpts/deloitte-compliance-excerpt.txt", // Simulate full report
        pages: 89,
        coverage: "45 major U.S. clinical research sites",
        keyInsights: [
          "All 45 sites with complete FDA inspection histories",
          "5-year trend analysis (compliance improving vs. declining)",
          "Detailed Form 483 observations and warning letters",
          "IRB approval efficiency benchmarks",
          "Strategic recommendations for site qualification"
        ]
      }
    ],

    // Negotiation parameters
    negotiation: {
      minPriceScorecard: 0.008, // 20% discount max
      minPriceFull: 0.038,      // 24% discount max
      bundleDiscount: 0.10,     // 10% off if bundled
      customReportPrice: 0.025, // Custom report for 8-10 specific sites
    }
  },

  // SELLER C: Stanford Center for Clinical Research
  {
    id: "seller-stanford",
    name: "Dr. Priya Sharma",
    company: "Stanford Center for Clinical Research",
    title: "Director, Clinical Trials Optimization Lab",
    expertise: "Enrollment Performance Benchmarking",

    // System prompt location
    promptFile: "resources/clinical-trial/prompts/seller-stanford-prompt.txt",

    // Seller's blockchain wallet
    wallet: {
      address: "0x8a9dc7bde9a1f3d5c8f6e2a4b7d9c1e3f5a8b2c4", // Replace with actual wallet
      privateKey: process.env.SELLER_STANFORD_PRIVATE_KEY, // Store in .env
    },

    // Products offered
    offerings: [
      {
        id: "stanford-key-findings",
        type: "excerpt",
        title: "Key Findings Report - Enrollment Benchmarks",
        description: "Industry benchmarks + top 8 elite performer site profiles. 12 pages.",
        price: 0.02, // USDC
        contentFile: "resources/clinical-trial/excerpts/stanford-enrollment-excerpt.txt",
        pages: 12,
        coverage: "Industry-wide benchmarks + 8 elite sites",
        keyInsights: [
          "Phase III oncology enrollment benchmarks (industry aggregate)",
          "Top 8 'elite performer' sites with detailed metrics",
          "Enrollment velocity, retention rates, time to first patient",
          "5 chronic underperformer sites to avoid",
          "Actionable recommendations for site selection"
        ]
      },
      {
        id: "stanford-full",
        type: "full",
        title: "Full Report - 60 Sites + Predictive Models",
        description: "Comprehensive enrollment analysis for 60 sites, predictive models, case studies. 124 pages.",
        price: 0.09, // USDC
        contentFile: "resources/clinical-trial/excerpts/stanford-enrollment-excerpt.txt", // Simulate full
        pages: 124,
        coverage: "All 60 major U.S. cancer centers",
        keyInsights: [
          "All 60 sites with complete enrollment performance data",
          "5-year trend analysis (site enrollment improving vs. declining)",
          "Predictive enrollment models (input trial specs, get projected timeline)",
          "12 detailed case studies (successful and failed trials)",
          "Seasonal enrollment patterns, cost-per-patient benchmarks"
        ]
      }
    ],

    // Negotiation parameters
    negotiation: {
      minPriceKeyFindings: 0.015, // 25% discount max
      minPriceFull: 0.07,         // 22% discount max
      bundleDiscount: 0.10,       // 10% off if bundled
      customAnalysisPrice: 0.05,  // Custom analysis for specific sites
      academicDiscount: 0.015,    // Academic discount if buyer shares trial data
    }
  }
];

// ============================================================================
// EXPECTED DEMO FLOW
// ============================================================================

export const DEMO_FLOW = {
  phase1: {
    name: "Introduction & Free Research",
    description: "Buyer introduces themselves and outlines what they know from public sources",
    duration: "2-3 minutes",
    expectedActions: [
      "Buyer shares research question and trial parameters",
      "Buyer lists 5-7 candidate sites based on public knowledge",
      "Buyer identifies knowledge gaps requiring premium data"
    ]
  },

  phase2: {
    name: "Seller Pitches & Initial Negotiation",
    description: "Sellers pitch their offerings and explain value propositions",
    duration: "3-4 minutes",
    expectedActions: [
      "McKinsey explains patient demographics data",
      "Deloitte emphasizes regulatory compliance risk mitigation",
      "Stanford highlights enrollment performance as key success factor",
      "Buyer asks clarifying questions about content and pricing"
    ]
  },

  phase3: {
    name: "Negotiation & Strategic Purchasing",
    description: "Buyer negotiates prices and selects which data to purchase",
    duration: "3-4 minutes",
    expectedPurchases: [
      { seller: "McKinsey", product: "excerpt", price: 0.01, likelihood: "high" },
      { seller: "Deloitte", product: "full", price: 0.05, likelihood: "high" },
      { seller: "Stanford", product: "excerpt", price: 0.02, likelihood: "high" }
    ],
    totalSpend: 0.08, // Under budget of 0.20
    expectedNegotiations: [
      "Buyer requests custom excerpt from McKinsey (10 sites instead of 50)",
      "Buyer asks for bundle discount across sellers",
      "Sellers offer consultation calls as value-adds"
    ]
  },

  phase4: {
    name: "Data Analysis & Site Recommendation",
    description: "Buyer synthesizes purchased data and makes recommendation",
    duration: "2-3 minutes",
    expectedOutcome: {
      recommendedSites: [
        {
          rank: 1,
          name: "Johns Hopkins Sidney Kimmel Cancer Center",
          location: "Baltimore, MD",
          rationale: "Perfect compliance (Deloitte: 100 score), high TNBC volume (McKinsey: 210 pts/yr), elite enrollment (Stanford: 2.8 pt/mo)"
        },
        {
          rank: 2,
          name: "Dana-Farber Cancer Institute",
          location: "Boston, MA",
          rationale: "Gold standard compliance (Deloitte), good diversity (McKinsey: 35%), highest retention (Stanford: 91%)"
        },
        {
          rank: 3,
          name: "UCSF Helen Diller Comprehensive Cancer Center",
          location: "San Francisco, CA",
          rationale: "Perfect compliance, highest diversity (McKinsey: 54%), strong West Coast coverage"
        }
      ],
      researchCost: 0.08,
      budgetRemaining: 0.12,
      confidenceLevel: "High"
    }
  }
};

// ============================================================================
// BLOCKCHAIN TRANSACTION CONFIGURATION
// ============================================================================

export const BLOCKCHAIN_CONFIG = {
  network: "base-sepolia", // Test network
  currency: "USDC",
  contractAddress: process.env.USDC_CONTRACT_ADDRESS,

  // Transaction templates
  transactionTemplates: {
    excerpt: {
      gasLimit: 100000,
      confirmations: 1
    },
    full: {
      gasLimit: 150000,
      confirmations: 1
    }
  }
};

// ============================================================================
// UI DISPLAY CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  // Seller display info
  sellerCards: [
    {
      id: "seller-mckinsey",
      displayName: "McKinsey & Company",
      avatar: "👔", // Or use image path
      color: "#004977", // McKinsey brand color
      tagline: "Patient Demographics Expert"
    },
    {
      id: "seller-deloitte",
      displayName: "Deloitte Life Sciences",
      avatar: "🛡️",
      color: "#86BC25", // Deloitte brand color
      tagline: "Regulatory Compliance Expert"
    },
    {
      id: "seller-stanford",
      displayName: "Stanford Research",
      avatar: "📊",
      color: "#8C1515", // Stanford brand color
      tagline: "Enrollment Performance Expert"
    }
  ],

  // Buyer display
  buyerCard: {
    id: "buyer-pharma",
    displayName: "BioTech Corp",
    avatar: "🔬",
    color: "#2E5EAA",
    budget: 0.20
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get seller configuration by ID
 */
export function getSellerById(sellerId) {
  return SELLER_AGENTS.find(seller => seller.id === sellerId);
}

/**
 * Get offering by seller ID and offering ID
 */
export function getOffering(sellerId, offeringId) {
  const seller = getSellerById(sellerId);
  if (!seller) return null;
  return seller.offerings.find(offering => offering.id === offeringId);
}

/**
 * Load content file
 */
export async function loadContent(contentFilePath) {
  const fs = require('fs').promises;
  try {
    return await fs.readFile(contentFilePath, 'utf-8');
  } catch (error) {
    console.error(`Error loading content from ${contentFilePath}:`, error);
    return null;
  }
}

/**
 * Calculate total spend
 */
export function calculateTotalSpend(purchases) {
  return purchases.reduce((total, purchase) => total + purchase.price, 0);
}

/**
 * Validate budget
 */
export function validateBudget(purchases, budget = BUYER_AGENT.research.budget) {
  const totalSpend = calculateTotalSpend(purchases);
  return {
    totalSpend,
    remainingBudget: budget - totalSpend,
    withinBudget: totalSpend <= budget
  };
}

export default {
  SCENARIO_INFO,
  BUYER_AGENT,
  SELLER_AGENTS,
  DEMO_FLOW,
  BLOCKCHAIN_CONFIG,
  UI_CONFIG,
  getSellerById,
  getOffering,
  loadContent,
  calculateTotalSpend,
  validateBudget
};
