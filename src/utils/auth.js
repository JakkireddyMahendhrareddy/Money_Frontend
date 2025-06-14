// utils/auth.js
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (with 5 minute buffer)
    if (payload.exp && payload.exp < (currentTime + 300)) {
      console.log('Token is expired or expiring soon');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("refreshToken");
};


const getAuthConfig = (navigate) => {
  const token = localStorage.getItem("token");
  
  if (!token) {
    clearAuthData();
    if (navigate) navigate("/login");
    return null;
  }

  // Add more robust token validation
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Check if token is expired (decode payload)
    const payload = JSON.parse(atob(tokenParts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }
  } catch (e) {
    console.log('Token validation failed:', e.message);
    clearAuthData();
    if (navigate) navigate("/login");
    return null;
  }
  
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};
export default getAuthConfig;
