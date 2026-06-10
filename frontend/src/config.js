const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  
  // If we are running frontend in dev (usually port 5173), API is on port 5001
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  
  // In production (EC2), we serve API from the same host on port 5001,
  // or via a reverse proxy (e.g. Nginx redirecting /api to port 5001).
  // Let's assume Nginx is proxying or it's port 5001 directly.
  return `${window.location.protocol}//${window.location.hostname}:5001`;
};

export const API_BASE_URL = getApiBaseUrl();
