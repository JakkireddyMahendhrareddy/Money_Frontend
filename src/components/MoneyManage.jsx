import Add from "./Add";
import axios from "axios";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

import { backEndUrl } from "../utils/utils.js";

const transactionTypeOptions = [
  { optionId: "INCOME", displayText: "Income" },
  { optionId: "EXPENSES", displayText: "Expenses" },
];

const MoneyManage = () => {
 
  //API's
  const transactionsUrl=`${backEndUrl}/transactions`        

  


  const navigate = useNavigate();
  const [selectTitle, setSelectTitle] = useState("");
  const [selectAmount, setSelectAmount] = useState("");
  const [arr, setArr] = useState([]);
  const [selectType, setType] = useState(transactionTypeOptions[0].optionId);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [greeting, setGreeting] = useState("sir");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const username = localStorage.getItem("username");

  // Create axios config with auth token
  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Redirect to login if no token
      navigate("/login");
      return null;
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      navigate("/login");
    }
  };

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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      if (!config) return;

      const response = await axios.get(transactionsUrl,config
      );

      if (response.data?.data) {
        setTransactions(response.data.data);
      } else if (Array.isArray(response.data)) {
        setTransactions(response.data);
      } else {
        console.error("Unexpected API response format:", response.data);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
      handleAuthError(error);
      setError("Failed to load transactions. Please try again.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    fetchTransactions();
  }, [navigate]);

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      console.log("Deleting transaction with ID:", id);

      const config = getAuthConfig();
      if (!config) return;

      await axios.delete(`${transactionsUrl}/${id}`, config);

      setTransactions((prevTransactions) =>
        prevTransactions.filter((transaction) => transaction._id !== id)
      );

      alert("Deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      handleAuthError(error);
      alert("Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    try {
      if (!transaction || !transaction._id) {
        console.error("Invalid transaction object:", transaction);
        return;
      }

      setEditId(transaction._id);
      setSelectTitle(transaction.title || "");
      setSelectAmount((transaction.amount || 0).toString());
      setType(transaction.type || "INCOME");

      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("Error in handleEdit:", error);
      alert("Could not edit this transaction. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectTitle || !selectAmount) {
      setError("Title and amount are required");
      return;
    }

    setLoading(true);
    setError("");

    const config = getAuthConfig();
    if (!config) {
      setLoading(false);
      return;
    }

    const newTransaction = {
      title: selectTitle,
      amount: parseFloat(selectAmount),
      type: selectType,
    };

    try {
      if (editId) {
        // Edit existing transaction
        const response = await axios.put(
          `${transactionsUrl}/${editId}`,
          newTransaction,
          config
        );

        if (response.data && (response.data.data || response.data)) {
          const updatedTransaction = response.data.data || response.data;

          setTransactions((prevTransactions) =>
            prevTransactions.map((t) =>
              t._id === editId ? updatedTransaction : t
            )
          );

          setSelectTitle("");
          setSelectAmount("");
          setType("INCOME");
          setEditId(null);

          alert("Transaction updated successfully");
        } else {
          console.error("Unexpected response format:", response);
          await fetchTransactions();
        }
      } else {
        // Add new transaction
        const response = await axios.post(transactionsUrl,
          newTransaction,
          config
        );

        const newTx = response.data.data || response.data;

        if (newTx) {
          setTransactions((prevTransactions) => [
            ...(Array.isArray(prevTransactions) ? prevTransactions : []),
            newTx,
          ]);

          setSelectTitle("");
          setSelectAmount("");
          setType("INCOME");

          alert("Transaction added successfully");
        } else {
          await fetchTransactions();
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      handleAuthError(error);
      setError(error.response?.data?.message || "Failed to submit transaction");
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
      const config = getAuthConfig();
      if (!config) return;

      await axios.delete(transactionsUrl, config);

      setTransactions([]);
      alert("All transactions deleted successfully.");
    } catch (error) {
      console.error("Delete All Error:", error);
      handleAuthError(error);
      alert("Failed to delete all transactions.");
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
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all"
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
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium shadow"
              >
                Export to Excel
              </button>
              <button
                onClick={handleDeleteAll}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium shadow"
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