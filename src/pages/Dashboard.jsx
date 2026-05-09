import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import {
  FaBox,
  FaExclamationTriangle,
  FaShoppingCart,
  FaWarehouse,
  FaSyncAlt,
  FaFileInvoice,
  FaRupeeSign,
} from "react-icons/fa";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* COLORS */
const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

/* FORMAT */
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num;
};

/* CARD */
const Card = ({ title, value, icon, trend, danger, iconBg, iconColor }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      className="
        relative overflow-hidden rounded-3xl
        border border-gray-200 dark:border-white/10
        bg-gray-50 dark:bg-[#0a0a0a]
        text-black dark:text-white
        backdrop-blur-xl p-5
      "
    >
      <div
        className={`absolute -top-10 -right-10 h-40 w-40 blur-3xl opacity-20 ${
          danger ? "bg-red-500" : "bg-green-500"
        }`}
      />

      <div className="relative z-10 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-white/50 uppercase truncate">
            {title}
          </p>

          <h2 className="mt-3 text-2xl sm:text-3xl font-black truncate">
            {formatNumber(value)}
          </h2>

          <div
            className={`
              mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold
              ${
                danger
                  ? "bg-red-500/20 text-red-500"
                  : "bg-green-500/20 text-green-600 dark:text-green-400"
              }
            `}
          >
            {trend}
          </div>
        </div>

        <div
          className={`
            h-14 w-14 rounded-2xl flex items-center justify-center text-2xl
            ${iconBg} ${iconColor}
          `}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

/* MAIN */
export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalSales: 0,
    totalBills: 0,
    lowStock: 0,
  });

  const [recentBills, setRecentBills] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [productsRes, billsRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase
          .from("bills")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const products = productsRes.data || [];
      const bills = billsRes.data || [];

      const totalStock = products.reduce((s, p) => s + Number(p.stock || 0), 0);
      const totalSales = bills.reduce((s, b) => s + Number(b.total_amount || 0), 0);

      const lowStock = products.filter((p) => Number(p.stock || 0) <= 5);

      setStats({
        totalProducts: products.length,
        totalStock,
        totalSales,
        totalBills: bills.length,
        lowStock: lowStock.length,
      });

      setRecentBills(bills);
      setLowStockItems(lowStock);

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyMap = {};

      bills.forEach((b) => {
        const day = days[new Date(b.created_at).getDay()];
        weeklyMap[day] = (weeklyMap[day] || 0) + Number(b.total_amount || 0);
      });

      setWeeklyData(days.map((d) => ({ name: d, sales: weeklyMap[d] || 0 })));

      setPieData(
        products.map((p) => ({
          name: p.product_name,
          value: Number(p.stock || 0),
        }))
      );
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-gray-200 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black dark:text-white">

      {/* HEADER */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black">Dashboard</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm">
            Real-time analytics overview
          </p>
        </div>

        {/* 🔥 RESPONSIVE BUTTON FIX */}
        <button
          onClick={fetchDashboard}
          className="
            flex items-center justify-center gap-2
            px-4 sm:px-5 py-3 rounded-2xl
            border border-gray-200 dark:border-white/10
            bg-gray-100 dark:bg-white/5
            hover:scale-105 transition-all duration-300
          "
        >
          <FaSyncAlt />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card title="Products" value={stats.totalProducts} icon={<FaBox />} trend="+12%" iconBg="bg-blue-500/15" iconColor="text-blue-500" />
        <Card title="Stock" value={stats.totalStock} icon={<FaWarehouse />} trend="+8%" iconBg="bg-green-500/15" iconColor="text-green-500" />
        <Card title="Revenue" value={stats.totalSales} icon={<FaRupeeSign />} trend="+24%" iconBg="bg-yellow-500/15" iconColor="text-yellow-500" />
        <Card title="Bills" value={stats.totalBills} icon={<FaShoppingCart />} trend="+5%" iconBg="bg-purple-500/15" iconColor="text-purple-500" />
        <Card title="Low Stock" value={stats.lowStock} icon={<FaExclamationTriangle />} trend="Alert" danger iconBg="bg-red-500/15" iconColor="text-red-500" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">

        {/* 🔥 RESPONSIVE CHART FIX */}
        <div className="2xl:col-span-2 p-6 rounded-3xl border bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4">Weekly Revenue</h2>

          <div className="h-[250px] sm:h-[300px] md:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area dataKey="sales" stroke="#22c55e" fill="#22c55e" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE */}
        <div className="p-6 rounded-3xl border bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4">Stock Distribution</h2>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={100}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LOWER GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* 🔥 LOW STOCK FIXED 2-COLUMN ALWAYS */}
        <div className="p-6 rounded-3xl border bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4">Low Stock</h2>

          <div className="grid grid-cols-2 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10"
              >
                <p className="font-semibold truncate">{item.product_name}</p>
                <p className="text-sm text-gray-500">
                  {item.bike_type} • {item.model}
                </p>
                <p className="text-red-500 font-bold mt-1">{item.stock}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT BILLS */}
        <div className="p-6 rounded-3xl border bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4">Recent Bills</h2>

          <div className="space-y-3">
            {recentBills.map((bill) => (
              <div
                key={bill.id}
                className="p-4 rounded-2xl bg-white/5 flex justify-between"
              >
                <div>
                  <p className="font-semibold">{bill.client_name}</p>
                  <p className="text-sm text-gray-500">#{bill.bill_number}</p>
                </div>

                <button
                  onClick={() => navigate(`/invoice/${bill.id}`)}
                  className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black"
                >
                  Invoice
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
