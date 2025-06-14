import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import MoneyManage from "./MoneyManage";
import { LogOut } from "lucide-react";

const MainLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // const handleLogout = () => {
  //   logout();
  //   navigate("/login");
  // };
  const handleLogout = () => {
  const confirmed = window.confirm("Are you sure you want to logout?");
  if (confirmed) {
    logout();
    navigate("/login");
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Money Manager</h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-white text-sm hidden sm:inline">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer max-w-[200px] mx-auto items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-base font-medium py-2 px-4 rounded-full shadow-sm transition duration-200 ease-in-out"
              title="Logout"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        <MoneyManage />
      </main>

      <footer className="bg-gray-800 text-gray-300 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>
            © {new Date().getFullYear()} Money Manager. All rights reserved.
          </p>
          <p className="mt-1 text-gray-400">Track your finances with easy</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

{
  /* <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white hover:text-red-500 cursor-pointer transition"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 16l4-4m0 0l-4-4m4 4H3m13 4v1m0-10v1"
                />
              </svg> */
}
