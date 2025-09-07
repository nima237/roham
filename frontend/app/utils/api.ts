// Helper function to get API URLs
export const getApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Add /api/ prefix if not present
  const apiPrefix = cleanPath.startsWith('api/') ? '' : 'api/';
  
  return `/${apiPrefix}${cleanPath}`;
};

// Get the base API URL from environment or use default
export const getBaseApiUrl = (): string => {
  // In production, use the same domain
  if (typeof window !== 'undefined') {
    return '';
  }
  // For SSR, use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || '';
};

// Get full API URL for external calls (when needed)
export const getFullApiUrl = (path: string): string => {
  const baseUrl = getBaseApiUrl();
  const apiPath = getApiUrl(path);
  
  if (baseUrl) {
    return `${baseUrl}${apiPath}`;
  }
  
  return apiPath;
}; 