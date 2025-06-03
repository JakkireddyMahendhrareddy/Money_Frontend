// Temporary debugging version
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('ProtectedRoute useEffect running'); // Debug log
    
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'exists' : 'not found'); // Debug log
    
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    
    setIsAuthenticated(true);
    setLoading(false);
  }, []); // Make sure this is empty!

  console.log('ProtectedRoute render - loading:', loading, 'auth:', isAuthenticated); // Debug log

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;