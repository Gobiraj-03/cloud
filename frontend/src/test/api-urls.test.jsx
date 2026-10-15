import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, buildApiUrl } from '../api/client';
import { reportApi } from '../api/reportApi';

describe('Frontend API URL & Base URL Configuration Tests', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset global fetch mock
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore environment
    import.meta.env.VITE_API_BASE_URL = originalEnv.VITE_API_BASE_URL;
    import.meta.env.VITE_API_URL = originalEnv.VITE_API_URL;
  });

  it('1. getApiBaseUrl returns empty string in default development environment', () => {
    delete import.meta.env.VITE_API_BASE_URL;
    delete import.meta.env.VITE_API_URL;

    expect(getApiBaseUrl()).toBe('');
  });

  it('2. getApiBaseUrl prioritizes VITE_API_BASE_URL and strips trailing slashes', () => {
    import.meta.env.VITE_API_BASE_URL = 'https://api.assetflow.awsapprunner.com///';
    import.meta.env.VITE_API_URL = 'https://legacy.example.com';

    expect(getApiBaseUrl()).toBe('https://api.assetflow.awsapprunner.com');
  });

  it('3. getApiBaseUrl falls back to legacy VITE_API_URL if VITE_API_BASE_URL is absent', () => {
    delete import.meta.env.VITE_API_BASE_URL;
    import.meta.env.VITE_API_URL = 'https://fallback.awsapprunner.com/';

    expect(getApiBaseUrl()).toBe('https://fallback.awsapprunner.com');
  });

  it('4. buildApiUrl constructs relative URL when base URL is empty (local dev)', () => {
    delete import.meta.env.VITE_API_BASE_URL;
    delete import.meta.env.VITE_API_URL;

    expect(buildApiUrl('/api/health')).toBe('/api/health');
    expect(buildApiUrl('api/assets')).toBe('/api/assets');
  });

  it('5. buildApiUrl prepends remote base URL correctly in production', () => {
    import.meta.env.VITE_API_BASE_URL = 'https://assetflow-api.awsapprunner.com';

    expect(buildApiUrl('/api/assets')).toBe('https://assetflow-api.awsapprunner.com/api/assets');
    expect(buildApiUrl('/api/auth/login')).toBe('https://assetflow-api.awsapprunner.com/api/auth/login');
  });

  it('6. reportApi.downloadCsv requests the fully qualified base URL with credentials', async () => {
    import.meta.env.VITE_API_BASE_URL = 'https://assetflow-api.awsapprunner.com';

    let capturedUrl = null;
    let capturedOptions = null;

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="assetflow_inventory.csv"',
          'Content-Type': 'text/csv'
        }),
        blob: () => Promise.resolve(new Blob(['tag,name\nAST-1,Laptop\n'], { type: 'text/csv' }))
      });
    });

    // Mock DOM download elements
    const mockUrl = 'blob:http://localhost:5173/mock-uuid';
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
    window.URL.revokeObjectURL = vi.fn();

    const result = await reportApi.downloadCsv('asset_inventory', { category: 'LAPTOP' });

    expect(result.success).toBe(true);
    expect(capturedUrl).toBe('https://assetflow-api.awsapprunner.com/api/reports/asset_inventory/csv?category=LAPTOP');
    expect(capturedOptions.credentials).toBe('include');
    expect(capturedOptions.headers.Accept).toBe('text/csv');
  });
});
