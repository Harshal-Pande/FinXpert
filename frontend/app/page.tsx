"use client";

import HealthScore from "../components/HealthScore";

export default function Dashboard() {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Top Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-sm text-gray-500">Total Clients</h2>
          <p className="text-2xl font-bold">0</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-sm text-gray-500">Total AUM</h2>
          <p className="text-2xl font-bold">₹0</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-sm text-gray-500">Market Alerts</h2>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-2 gap-6">
        
        {/* Health Score */}
        <div className="bg-white p-4 rounded-xl shadow">
          <HealthScore />
        </div>

        {/* To-Do */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-2">To-Do List</h2>
          <input
            type="text"
            placeholder="Add task..."
            className="border p-2 w-full rounded"
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        
        {/* Graph placeholder */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-2">Goal Progress</h2>
          <p className="text-gray-500">Graph coming soon...</p>
        </div>

        {/* AI Summary */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-2">AI Summary</h2>
          <p className="text-gray-500">
            Portfolio is stable. Consider increasing diversification.
          </p>
        </div>
      </div>
    </div>
  );
}