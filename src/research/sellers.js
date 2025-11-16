export const SELLER_PROFILES = [
  {
    id: 'seller-mckinsey',
    name: 'McKinsey Clinical Insights',
    documentTitle: 'Patient Population Demographics',
    description: 'Phase III oncology patient availability by region and indication.',
    basePrice: 0.04,
    excerptPrice: 0.01,
    excerptTopic: 'liability_mistakes',
    contact: 'oncology@mckinsey.example',
    walletAddress: '0x4ae934efc1b61b3686394ffcf8c4a6a3780b7cb9',
    resourcePath: 'resources/clinical-trial/Benchmarking recruitment rates for phase III trials.pdf',
    promptPath: 'resources/clinical-trial/prompts/seller-mckinsey-prompt.txt',
    excerptPath: 'resources/clinical-trial/excerpts/mckinsey-demographics-excerpt.txt',
    preferredPurchase: 'excerpt'
  },
  {
    id: 'seller-deloitte',
    name: 'Deloitte Regulatory Desk',
    documentTitle: 'Site Regulatory Compliance History',
    description: 'Audit outcomes and inspection histories for oncology trial sites.',
    basePrice: 0.05,
    excerptPrice: 0.01,
    excerptTopic: 'liability_mistakes',
    contact: 'compliance@deloitte.example',
    walletAddress: '0x0068dce0d43c0fbb98d431e1b2c438113356adfb',
    resourcePath: 'resources/clinical-trial/Comprehensive PDF report on   barriers to enrollment.pdf',
    promptPath: 'resources/clinical-trial/prompts/seller-deloitte-prompt.txt',
    excerptPath: 'resources/clinical-trial/excerpts/deloitte-compliance-excerpt.txt',
    preferredPurchase: 'full'
  },
  {
    id: 'seller-stanford',
    name: 'Stanford Trial Metrics',
    documentTitle: 'Enrollment Rate Benchmarks',
    description: 'Historic enrollment velocity for comparable oncology protocols.',
    basePrice: 0.09,
    excerptPrice: 0.02,
    excerptTopic: 'liability_mistakes',
    contact: 'benchmarks@stanford.example',
    walletAddress: '0x8a9dc79a31fea68fd99f41199f3fc199ade52dd3',
    resourcePath: 'resources/clinical-trial/Enrollment Success, Factors, and Prediction Models in Cancer Trials.pdf',
    promptPath: 'resources/clinical-trial/prompts/seller-stanford-prompt.txt',
    excerptPath: 'resources/clinical-trial/excerpts/stanford-enrollment-excerpt.txt',
    preferredPurchase: 'excerpt'
  }
];
