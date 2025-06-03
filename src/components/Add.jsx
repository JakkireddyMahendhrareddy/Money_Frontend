import React from "react";

const Add = ({ transaction, onEdit, onDelete, isLoading }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date error";
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors rounded-lg border shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start">
            <div
              className={`w-2 h-2 mt-2 mr-2 rounded-full ${
                transaction.type === "INCOME" ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <div>
              <h3 className="text-lg font-medium text-gray-800">
                {transaction.title}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 mt-1">
                <span>{formatDate(transaction.createdAt || new Date())}</span>
                {transaction.updatedAt &&
                  transaction.updatedAt !== transaction.createdAt && (
                    <span className="sm:ml-2 mt-1 sm:mt-0">
                      (Updated: {formatDate(transaction.updatedAt)})
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span
            className={`font-semibold ${
              transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
            }`}
          >
            {transaction.type === "INCOME" ? "+" : "-"}₹
            {transaction.amount.toFixed(2)}
          </span>

          <div className="flex mt-2 space-x-2">
            <button
              onClick={() => onEdit(transaction)}
              className={`p-1 text-blue-600 hover:text-blue-800 cursor-pointer ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
              aria-label="Edit"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this transaction?"
                  )
                ) {
                  onDelete(transaction._id);
                }
              }}
              className={`p-1 text-red-600 hover:text-red-800 cursor-pointer ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
              aria-label="Delete"
            >
              {isLoading ? "⏳" : "🗑️"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Add;
