import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { backEndUrl } from '../utils/utils.js';

const Register = () => {
  // API's - Fixed: Added /api prefix to match your login pattern
  const RegisterUrl = `${backEndUrl}/api/auth/register`;

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email validation helper
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(formData.email)) newErrors.email = "Enter a valid email";
    
    if (!formData.password.trim()) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    return newErrors;
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear field-specific error when user starts typing
    setErrors((prev) => ({
      ...prev,
      [e.target.name]: "",
    }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(""); // Fixed: Use setServerError instead of setError
    setLoading(true);

    // Client-side validation
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting registration to:', RegisterUrl); // Debug log
      const { data } = await axios.post(RegisterUrl, {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      });
      console.log('Registration response:', data);

      if (data.success) {
        // Optional: Auto-login after registration
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", data.user?.name || formData.name);
          navigate("/");
        } else {
          // Redirect to login page if no auto-login
          navigate("/login", {
            state: {
              message: "Registration successful! Please log in with your credentials.",
              email: formData.email // Pre-fill email on login page
            }
          });
        }
      } else {
        setServerError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error('Registration error:', err); // Debug log
      
      if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Handle field-specific validation errors from backend
        const backendErrors = {};
        if (Array.isArray(err.response.data.errors)) {
          err.response.data.errors.forEach(error => {
            if (error.field) {
              backendErrors[error.field] = error.message;
            }
          });
          setErrors(backendErrors);
        } else {
          setServerError("Validation errors occurred. Please check your inputs.");
        }
      } else if (err.response?.status === 409) {
        setServerError("Email already exists. Please use a different email or try logging in.");
      } else if (err.response?.status === 404) {
        setServerError("Registration endpoint not found. Please check server configuration.");
      } else if (err.response?.status === 400) {
        setServerError("Invalid registration data. Please check your inputs.");
      } else if (err.response?.status === 422) {
        setServerError("Validation error. Please check your inputs and try again.");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium underline text-indigo-600 hover:text-indigo-500"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Server Error Display */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">{serverError}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Create a password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              {formData.password && formData.password.length > 0 && (
                <div className="mt-1">
                  <div className="text-xs text-gray-600">
                    Password strength: {formData.password.length >= 8 ? "Strong" : formData.password.length >= 6 ? "Medium" : "Weak"}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group cursor-pointer relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin  -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-600">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;