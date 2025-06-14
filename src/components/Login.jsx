import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { backEndUrl } from "../utils/utils.js";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const LoginUrl = `${backEndUrl}/api/auth/login`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(
        LoginUrl,
        {
          email,
          password,
        },
        {
          timeout: 5000, // 8 second timeout
        }
      );

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.name);
        // Navigate immediately
        navigate("/");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      // Handle timeout specifically
      if (err.code === "ECONNABORTED") {
        setError(
          "Request timed out. Please refersh and try again."
        );
        return;
      }

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 404) {
        setError(
          "Login endpoint not found. Please check server configuration."
        );
      } else if (err.response?.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (err.response?.status === 429) {
        setError("Too many login attempts. Please wait and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setLoading(true);

  //   if (!email || !password) {
  //     setError("Please fill in all fields.");
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     const { data } = await axios.post(
  //       LoginUrl,
  //       {
  //         email,
  //         password,
  //       },
  //       {
  //         timeout: 5000, // Reduce timeout
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );

  //     if (data.success) {
  //       // Batch localStorage operations
  //       localStorage.setItem("token", data.token);
  //       localStorage.setItem("username", data.user.name);
  //       navigate("/");
  //     } else {
  //       setError(data.message || "Invalid credentials");
  //     }
  //   } catch (err) {
  //     // Your existing error handling
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 p-6 sm:p-8 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-800">
            Sign in to your account
          </h2>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute top-9 right-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex cursor-pointer justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          {/* Redirect */}
          <div className="text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="font-medium cursor-pointer text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
