import {
  buildUserActionsSection,
  buildPerformanceBenchmarksSection,
  extractEntries,
  type BenchmarkEntryResult,
} from './utils';

const mockUserActionsJson: Record<string, BenchmarkEntryResult> = {
  loadNewAccount: {
    testTitle: 'benchmark-user-actions-load-new-account',
    persona: 'standard',
    mean: { load_new_account: 523.4 },
    stdDev: { load_new_account: 45.2 },
    p75: { load_new_account: 550 },
    p95: { load_new_account: 612 },
  },
  confirmTx: {
    testTitle: 'benchmark-user-actions-confirm-tx',
    persona: 'standard',
    mean: { confirm_tx: 3456.7 },
    stdDev: { confirm_tx: 210.3 },
    p75: { confirm_tx: 3600 },
    p95: { confirm_tx: 3812 },
  },
  bridgeUserActions: {
    testTitle: 'benchmark-user-actions-bridge',
    persona: 'standard',
    mean: { bridgePageLoad: 200.1, bridgeTokenSwitch: 150.8 },
    stdDev: { bridgePageLoad: 18.5, bridgeTokenSwitch: 12.3 },
    p75: { bridgePageLoad: 215, bridgeTokenSwitch: 160 },
    p95: { bridgePageLoad: 245, bridgeTokenSwitch: 178 },
  },
};

const mockPerformanceOnboardingJson: Record<string, BenchmarkEntryResult> = {
  onboardingImportWallet: {
    testTitle: 'benchmark-onboarding-import-wallet',
    persona: 'standard',
    mean: {
      importWalletToSocialScreen: 209,
      srpButtonToSrpForm: 53,
      confirmSrpToPasswordForm: 150,
      doneButtonToHomeScreen: 8500,
    },
    stdDev: {
      importWalletToSocialScreen: 32,
      srpButtonToSrpForm: 8,
      confirmSrpToPasswordForm: 20,
      doneButtonToHomeScreen: 600,
    },
    p75: {
      importWalletToSocialScreen: 230,
      srpButtonToSrpForm: 58,
      confirmSrpToPasswordForm: 165,
      doneButtonToHomeScreen: 9000,
    },
    p95: {
      importWalletToSocialScreen: 280,
      srpButtonToSrpForm: 70,
      confirmSrpToPasswordForm: 195,
      doneButtonToHomeScreen: 10200,
    },
  },
};

const mockPerformanceAssetsJson: Record<string, BenchmarkEntryResult> = {
  assetDetails: {
    testTitle: 'benchmark-asset-details',
    persona: 'powerUser',
    mean: { assetClickToPriceChart: 4200 },
    stdDev: { assetClickToPriceChart: 350 },
    p75: { assetClickToPriceChart: 4500 },
    p95: { assetClickToPriceChart: 5100 },
  },
};

describe('extractEntries', () => {
  it('filters out entries without a mean object', () => {
    const data = {
      valid: { mean: { metric: 100 } },
      invalid: { testTitle: 'no-mean' },
    } as Record<string, BenchmarkEntryResult>;

    const entries = extractEntries(data);
    expect(entries).toHaveLength(1);
    expect(entries[0].benchmarkName).toBe('valid');
  });
});

describe('buildUserActionsSection', () => {
  const entries = extractEntries(mockUserActionsJson);

  it('renders a collapsible section with all user action entries', () => {
    const html = buildUserActionsSection(entries);

    expect(html).toContain('🏃 User Actions Benchmark');
    expect(html).toContain('<details>');
    expect(html).toContain('<table>');
    expect(html).toContain('Load New Account');
    expect(html).toContain('Confirm Tx');
    expect(html).toContain('Bridge User Actions');
    expect(html).toContain('load_new_account');
    expect(html).toContain('confirm_tx');
    expect(html).toContain('bridgePageLoad');
    expect(html).toContain('bridgeTokenSwitch');
    expect(html).toContain('>523<');
    expect(html).toContain('>3457<');
  });

  it('uses rowspan for actions with multiple metrics', () => {
    const html = buildUserActionsSection(entries);

    expect(html).toContain('rowspan="2"'); // bridgeUserActions: 2 metrics
    expect(html).toContain('rowspan="1"'); // loadNewAccount: 1 metric
  });

  it('returns empty string when no data', () => {
    expect(buildUserActionsSection([])).toBe('');
  });

  it('shows dash for missing statistical fields', () => {
    const html = buildUserActionsSection([
      { benchmarkName: 'noStats', entry: { mean: { myMetric: 100 } } },
    ]);

    const dashes = html.match(/>-</g);
    expect(dashes).toHaveLength(3); // stdDev, p75, p95
  });
});

describe('buildPerformanceBenchmarksSection', () => {
  const entries = [
    ...extractEntries(mockPerformanceOnboardingJson),
    ...extractEntries(mockPerformanceAssetsJson),
  ];

  it('renders a collapsible section with all performance entries', () => {
    const html = buildPerformanceBenchmarksSection(entries);

    expect(html).toContain('⚡ Performance Benchmarks');
    expect(html).toContain('<details>');
    expect(html).toContain('<table>');
    expect(html).toContain('Onboarding Import Wallet');
    expect(html).toContain('Asset Details');
    expect(html).toContain('importWalletToSocialScreen');
    expect(html).toContain('srpButtonToSrpForm');
    expect(html).toContain('doneButtonToHomeScreen');
    expect(html).toContain('assetClickToPriceChart');
    expect(html).toContain('>209<');
    expect(html).toContain('>4200<');
  });

  it('uses rowspan for benchmarks with multiple metrics', () => {
    const html = buildPerformanceBenchmarksSection(
      extractEntries(mockPerformanceOnboardingJson),
    );

    expect(html).toContain('rowspan="4"');
  });

  it('returns empty string when no data', () => {
    expect(buildPerformanceBenchmarksSection([])).toBe('');
  });
});
