import Add from "./Add";
import axios from "axios";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import getAuthConfig, { clearAuthData, isTokenValid } from "../utils/auth.js";
import { backEndUrl } from "../utils/utils.js";

const transactionTypeOptions = [
  { optionId: "INCOME", displayText: "Income" },
  { optionId: "EXPENSES", displayText: "Expenses" },
];

const MoneyManage = () => {
  // FIXED: Use consistent URL construction with /api prefix
  const transactionsUrl = `${backEndUrl}/api/transactions`;
  console.log(transactionsUrl, "Transaction URL");

  const navigate = useNavigate();
  const [selectTitle, setSelectTitle] = useState("");
  const [selectAmount, setSelectAmount] = useState("");
  const [selectType, setType] = useState(transactionTypeOptions[0].optionId);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("sir");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  const username = localStorage.getItem("username");

  // Enhanced authentication error handler
  const handleAuthError = async (error, operation = "") => {
    console.error(
      `Auth error during ${operation}:`,
      error.response?.status,
      error.response?.data
    );

    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || "";

      // Check if it's a token expiration error
      if (
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("token")
      ) {
        // Try to refresh token if you have refresh token logic
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken && retryCount < 1) {
          try {
            setRetryCount((prev) => prev + 1);
            const refreshResponse = await axios.post(
              `${backEndUrl}/auth/refresh`,
              {
                refreshToken: refreshToken,
              }
            );

            if (refreshResponse.data?.token) {
              localStorage.setItem("token", refreshResponse.data.token);
              setError("");
              return true; // Indicate that token was refreshed
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }
        }
      }

      // If refresh failed or not available, clear auth and redirect
      setError("Your session has expired. Please login again.");
      setTimeout(() => {
        clearAuthData();
        navigate("/login");
      }, 2000);
    } else if (error.response?.status === 403) {
      setError(
        "Access denied. You don't have permission to perform this action."
      );
    } else {
      setError(`An error occurred during ${operation}. Please try again.`);
    }

    return false;
  };

  // Setup axios interceptor for automatic token handling
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token && isTokenValid(token)) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("Added token to request:", config.url);
        } else {
          console.log("No valid token for request:", config.url);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem("refreshToken");
          if (refreshToken) {
            try {
              const refreshResponse = await axios.post(
                `${backEndUrl}/auth/refresh`,
                {
                  refreshToken: refreshToken,
                }
              );

              if (refreshResponse.data?.token) {
                localStorage.setItem("token", refreshResponse.data.token);
                originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              clearAuthData();
              navigate("/login");
              return Promise.reject(refreshError);
            }
          } else {
            clearAuthData();
            navigate("/login");
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  const handleExport = () => {
    if (transactions.length === 0) {
      alert("No data to export");
      return;
    }

    const exportData = transactions.map(
      ({ title, amount, type, createdAt }) => ({
        Title: title,
        Amount: amount,
        Type: type,
        Date: new Date(createdAt).toLocaleDateString(),
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(data, "transactions.xlsx");
  };

  // Rotate greeting every 2 seconds
  useEffect(() => {
    const greetings = ["sir", "mam"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % greetings.length;
      setGreeting(greetings[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async (isRetry = false) => {
    try {
      setLoading(true);
      setError("");

      const config = getAuthConfig(navigate);
      console.log("Auth config:", config);

      if (!config) {
        setError("Session expired. Please log in again.");
        return;
      }

      console.log("Fetching transactions from:", transactionsUrl);

      const response = await axios.get(transactionsUrl, config);
      console.log("Fetch response:", response.data);

      // Handle different response formats
      if (response.data?.success && response.data?.data) {
        setTransactions(response.data.data);
      } else if (response.data?.data) {
        setTransactions(response.data.data);
      } else if (Array.isArray(response.data)) {
        setTransactions(response.data);
      } else {
        console.error("Unexpected API response format:", response.data);
        setTransactions([]);
        setError("Received unexpected data format from server.");
      }

      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching transactions:", error);

      if (error.response?.status === 401) {
        console.log("401 error - clearing auth data and redirecting");
        clearAuthData();
        navigate("/login");
        setError("Session expired. Please log in again.");
        return;
      } else if (error.response?.status === 404) {
        setError(
          "Transactions endpoint not found. Please check server configuration."
        );
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(`Network error: ${error.message}`);
      } else {
        setError("Failed to fetch transactions. Please try again.");
      }

      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Enhanced authentication check
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    console.log(
      "Initial auth check - Token exists:",
      !!token,
      "Username:",
      username
    );

    if (!token || !username) {
      console.log("No token or username found");
      clearAuthData();
      navigate("/login");
      return;
    }

    if (!isTokenValid(token)) {
      console.log("Invalid token found");
      clearAuthData();
      navigate("/login");
      return;
    }

    fetchTransactions();
  }, [navigate]);

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors
      console.log("Deleting transaction with ID:", id);

      const config = getAuthConfig(navigate);
      if (!config) {
        setError("Session expired. Please log in again.");
        return;
      }

      await axios.delete(`${transactionsUrl}/${id}`, config);

      // Update local state to remove deleted transaction
      setTransactions((prevTransactions) =>
        prevTransactions.filter((transaction) => transaction._id !== id)
      );

      alert("Transaction deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);

      // Handle different error scenarios
      if (error.response?.status === 401) {
        console.log("401 error - clearing auth data and redirecting");
        clearAuthData();
        navigate("/login");
        setError("Session expired. Please log in again.");
      } else if (error.response?.status === 404) {
        setError("Transaction not found or already deleted.");
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
        alert(`Failed to delete: ${error.response.data.message}`);
      } else if (error.message) {
        setError(`Network error: ${error.message}`);
        alert("Failed to delete transaction. Please check your connection.");
      } else {
        setError("Failed to delete transaction");
        alert("Failed to delete transaction. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle setting up a transaction for editing (no API call needed)
  const handleEdit = (transaction) => {
    try {
      // Validate transaction object
      if (!transaction || !transaction._id) {
        console.error("Invalid transaction object:", transaction);
        setError("Invalid transaction data. Cannot edit this transaction.");
        alert("Cannot edit this transaction. Invalid data.");
        return;
      }

      // Clear any previous errors
      setError("");

      console.log("Setting up transaction for editing:", transaction);

      // Set form fields with transaction data
      setEditId(transaction._id);
      setSelectTitle(transaction.title || "");
      setSelectAmount((transaction.amount || 0).toString());
      setType(transaction.type || "INCOME");

      // Scroll to form for better UX
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        console.warn("Form element not found for scrolling");
      }

      console.log("Transaction set for editing with ID:", transaction._id);
    } catch (error) {
      console.error("Error in handleEdit:", error);
      setError("Could not prepare transaction for editing.");
      alert("Could not edit this transaction. Please try again.");
    }
  };

  // Handle updating a transaction (this is where the API call happens)
  const handleUpdate = async (id, updatedData) => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors
      console.log("Updating transaction with ID:", id, "Data:", updatedData);

      const config = getAuthConfig(navigate);
      if (!config) {
        setError("Session expired. Please log in again.");
        return false;
      }

      const response = await axios.put(
        `${transactionsUrl}/${id}`,
        updatedData,
        config
      );
      console.log("Update response:", response.data);

      // Update local state with the updated transaction
      setTransactions((prevTransactions) =>
        prevTransactions.map((transaction) =>
          transaction._id === id
            ? response.data?.data ||
              response.data || { ...transaction, ...updatedData }
            : transaction
        )
      );

      // Clear edit mode
      setEditId("");
      setSelectTitle("");
      setSelectAmount("");
      setType("INCOME");

      // alert("Transaction updated successfully");
      return true;
    } catch (error) {
      console.error("Update error:", error);

      // Handle different error scenarios
      if (error.response?.status === 401) {
        console.log("401 error - clearing auth data and redirecting");
        clearAuthData();
        navigate("/login");
        setError("Session expired. Please log in again.");
      } else if (error.response?.status === 404) {
        setError("Transaction not found. It may have been deleted.");
        alert(
          "Transaction not found. It may have been deleted by another user."
        );
      } else if (error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Invalid data provided";
        setError(errorMessage);
        alert(`Update failed: ${errorMessage}`);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
        alert(`Failed to update: ${error.response.data.message}`);
      } else if (error.message) {
        setError(`Network error: ${error.message}`);
        alert("Failed to update transaction. Please check your connection.");
      } else {
        setError("Failed to update transaction");
        alert("Failed to update transaction. Please try again.");
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission (combines validation + update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate form data
      if (!selectTitle.trim()) {
        setError("Transaction title is required");
        alert("Please enter a transaction title");
        return;
      }

      if (
        !selectAmount ||
        isNaN(selectAmount) ||
        parseFloat(selectAmount) <= 0
      ) {
        setError("Please enter a valid amount greater than 0");
        alert("Please enter a valid amount greater than 0");
        return;
      }

      const transactionData = {
        title: selectTitle.trim(),
        amount: parseFloat(selectAmount),
        type: selectType,
      };

      let success = false;

      if (editId) {
        // Update existing transaction
        success = await handleUpdate(editId, transactionData);
      } else {
        // Create new transaction
        success = await handleCreate(transactionData);
      }

      if (success) {
        // Refresh transactions list to ensure consistency
        await fetchTransactions();
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setError("An unexpected error occurred");
      alert("An unexpected error occurred. Please try again.");
    }
  };

  // Handle creating a new transaction
  const handleCreate = async (transactionData) => {
    try {
      setLoading(true);
      setError("");
      console.log("Creating new transaction:", transactionData);

      const config = getAuthConfig(navigate);
      if (!config) {
        setError("Session expired. Please log in again.");
        return false;
      }

      const response = await axios.post(
        transactionsUrl,
        transactionData,
        config
      );
      console.log("Create response:", response.data);

      // Add new transaction to local state
      const newTransaction = response.data?.data || response.data;
      setTransactions((prevTransactions) => [
        newTransaction,
        ...prevTransactions,
      ]);

      // Clear form
      setSelectTitle("");
      setSelectAmount("");
      setType("INCOME");

      // alert("Transaction created successfully");
      return true;
    } catch (error) {
      console.error("Create error:", error);

      if (error.response?.status === 401) {
        clearAuthData();
        navigate("/login");
        setError("Session expired. Please log in again.");
      } else if (error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Invalid data provided";
        setError(errorMessage);
        alert(`Creation failed: ${errorMessage}`);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
        alert(`Failed to create: ${error.response.data.message}`);
      } else {
        setError("Failed to create transaction");
        alert("Failed to create transaction. Please try again.");
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  const getBalance = () => {
    return transactions.reduce(
      (acc, curr) =>
        curr.type === "INCOME" ? acc + curr.amount : acc - curr.amount,
      0
    );
  };

  const getIncome = () => {
    return transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const getExpenses = () => {
    return transactions
      .filter((t) => t.type === "EXPENSES")
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const handleDeleteAll = async () => {
    if (transactions.length === 0) {
      alert("No transactions to delete.");
      return;
    }

    const confirm = window.confirm(
      "Are you sure you want to delete all transactions?"
    );
    if (!confirm) return;

    try {
      setLoading(true);
      const config = getAuthConfig(navigate);
      if (!config) return;

      await axios.delete(transactionsUrl, config);

      setTransactions([]);
      alert("All transactions deleted successfully.");
    } catch (error) {
      console.error("Delete All Error:", error);
      const handled = await handleAuthError(error, "delete all transactions");
      if (!handled) {
        alert("Failed to delete all transactions.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-4">
      <div className="w-full max-w-2xl p-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl text-center text-white shadow-xl mb-8 transform hover:scale-105 transition-transform duration-300">
        <h1 className="text-4xl font-bold">Hi {username}</h1>
        <p className="text-xl mt-2 font-light">
          Welcome back to your Money Manager
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mb-8">
        <div className="p-6 bg-white text-gray-800 rounded-xl text-center shadow-lg border-t-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-600">Your Balance</h2>
          <p
            className={`text-3xl font-bold mt-3 ${
              getBalance() >= 0 ? "text-blue-600" : "text-red-600"
            }`}
          >
            ₹{getBalance().toFixed(2)}
          </p>
        </div>
        <div className="p-6 bg-white text-gray-800 rounded-xl text-center shadow-lg border-t-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-600">Your Income</h2>
          <p className="text-3xl font-bold mt-3 text-green-600">
            ₹{getIncome().toFixed(2)}
          </p>
        </div>
        <div className="p-6 bg-white text-gray-800 rounded-xl text-center shadow-lg border-t-4 border-red-500">
          <h2 className="text-lg font-semibold text-gray-600">Your Expenses</h2>
          <p className="text-3xl font-bold mt-3 text-red-600">
            ₹{getExpenses().toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold cursor-pointer mb-6 text-gray-800 border-b pb-2">
            {editId ? "Update Transaction" : "Add Transaction"}
          </h2>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col">
              <label className="text-gray-700 mb-2 font-medium">Title</label>
              <input
                type="text"
                placeholder="What was it for?"
                value={selectTitle}
                onChange={(e) => setSelectTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-gray-700 mb-2 font-medium">Amount</label>
              <input
                type="number"
                placeholder="Amount in ₹"
                value={selectAmount}
                onChange={(e) => setSelectAmount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-gray-700 mb-2 font-medium">Type</label>
              <select
                value={selectType}
                onChange={(e) => setType(e.target.value)}
                className="w-full cursor-pointer p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem top 50%",
                  backgroundSize: "0.65rem auto",
                  paddingRight: "2.5rem",
                }}
                disabled={loading}
              >
                {transactionTypeOptions.map((option) => (
                  <option key={option.optionId} value={option.optionId}>
                    {option.displayText}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className={`w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-md hover:shadow-lg transform hover:translate-y-0.5 transition-all duration-200 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Processing...
                </span>
              ) : (
                `${editId ? "Update" : "Add"} Transaction`
              )}
            </button>

            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setSelectTitle("");
                  setSelectAmount("");
                  setType(transactionTypeOptions[0].optionId);
                }}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-lg max-w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex gap-2 border-b-2 border-blue-500 pb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 hr-2">
                Transaction History
              </h2>
              <button
                onClick={handleExport}
                className="bg-green-500 cursor-pointer hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium shadow"
              >
                Export to Excel
              </button>
              <button
                onClick={handleDeleteAll}
                className="bg-red-500 cursor-pointer hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium shadow"
              >
                Delete All
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[26rem] overflow-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {loading && transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-gray-50 rounded-lg">
                <svg
                  className="animate-spin h-10 w-10 text-blue-500 mb-3"
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
                <p className="text-gray-500 text-center font-medium">
                  Loading transactions...
                </p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 text-center font-medium">
                  No transactions yet
                </p>
                <p className="text-gray-400 text-sm text-center mt-2">
                  Add your first transaction to start tracking
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((transaction) => (
                  <Add
                    key={transaction._id}
                    transaction={transaction}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={loading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoneyManage;


