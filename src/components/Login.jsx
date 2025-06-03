import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
 import {backEndUrl} from '../utils/utils.js';

const Login = () => {

  //API's
  const LoginUrl=`${backEndUrl}/auth/login`

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Token exists, redirect to home page
      
      navigate("/");
    }
  }, []); // Remove navigate from dependencies to prevent infinite loops

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please enter all details.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(LoginUrl, {
        email,
        password,
      });


      if (response.data.success) {
        // Save token and username from the response
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("username", response.data.user.name);

        // Navigate to the homepage
        navigate("/");
      } else {
        setError(response.data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message);
      } else {
        setError("Server error, please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-80 space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-700">
          Login
        </h2>
        {error && (
          <div className="text-red-600 text-sm text-center mb-2">{error}</div>
        )}
        <input
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="relative">
          <input
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div
            className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-sm text-center text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;