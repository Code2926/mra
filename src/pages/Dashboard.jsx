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

/* FORMAT LARGE NUMBERS */
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num;
};

/* CARD */
const Card = ({
  title,
  value,
  icon,
  trend,
  danger,
  iconBg,
  iconColor,
}) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      className="
        relative overflow-hidden rounded-3xl
        border border-gray-200 dark:border-white/10
        bg-gray-50 dark:bg-[#0a0a0a]
        text-black dark:text-white
        backdrop-blur-xl p-5
        transition-all duration-300 shadow-sm
      "
    >
      {/* glow */}
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
            className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              danger
                ? "bg-red-500/20 text-red-500"
                : "bg-green-500/20 text-green-600 dark:text-green-400"
            }`}
          >
            {trend}
          </div>
        </div>

        {/* ICON */}
        <div
          className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${iconBg} ${iconColor}`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

/* MAIN DASHBOARD */
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

  /* FETCH */
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

      const totalStock = products.reduce(
        (s, p) => s + Number(p.stock || 0),
        0
      );

      const totalSales = bills.reduce(
        (s, b) => s + Number(b.total_amount || 0),
        0
      );

      const lowStock = products.filter(
        (p) => Number(p.stock || 0) <= 5
      );

      setStats({
        totalProducts: products.length,
        totalStock,
        totalSales,
        totalBills: bills.length,
        lowStock: lowStock.length,
      });

      setRecentBills(bills);
      setLowStockItems(lowStock);

      /* WEEKLY */
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const weeklyMap = {};

      bills.forEach((b) => {
        const day = days[new Date(b.created_at).getDay()];

        weeklyMap[day] =
          (weeklyMap[day] || 0) + Number(b.total_amount || 0);
      });

      setWeeklyData(
        days.map((d) => ({
          name: d,
          sales: weeklyMap[d] || 0,
        }))
      );

      /* PIE */
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

  /* LOADING */
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="
              h-32 rounded-3xl
              bg-gray-200 dark:bg-white/5
              animate-pulse
            "
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black">Dashboard</h1>

          <p className="text-gray-500 dark:text-white/50 text-sm">
            Real-time analytics overview
          </p>
        </div>

        {/* REFRESH */}
        <button
          onClick={fetchDashboard}
          className="
            flex items-center justify-center gap-2
            px-4 sm:px-5
            py-3
            rounded-2xl
            border border-gray-200 dark:border-white/10
            bg-gray-100 dark:bg-white/5
            hover:scale-105
            transition-all duration-300
            text-black dark:text-white
          "
        >
          <FaSyncAlt />

          {/* DESKTOP TEXT */}
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card
          title="Products"
          value={stats.totalProducts}
          icon={<FaBox />}
          trend="+12%"
          iconBg="bg-blue-500/15"
          iconColor="text-blue-500"
        />

        <Card
          title="Stock"
          value={stats.totalStock}
          icon={<FaWarehouse />}
          trend="+8%"
          iconBg="bg-green-500/15"
          iconColor="text-green-500"
        />

        <Card
          title="Revenue"
          value={stats.totalSales}
          icon={<span className="font-bold">Rs</span>}
          trend="+24%"
          iconBg="bg-yellow-500/15"
          iconColor="text-yellow-500"
        />

        <Card
          title="Bills"
          value={stats.totalBills}
          icon={<FaShoppingCart />}
          trend="+5%"
          iconBg="bg-purple-500/15"
          iconColor="text-purple-500"
        />

        <Card
          title="Low Stock"
          value={stats.lowStock}
          icon={<FaExclamationTriangle />}
          trend="Alert"
          danger
          iconBg="bg-red-500/15"
          iconColor="text-red-500"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        {/* AREA CHART */}
        <div
          className="
            2xl:col-span-2
            p-4 sm:p-6
            rounded-3xl
            border border-gray-200 dark:border-white/10
            bg-gray-50 dark:bg-[#0a0a0a]
          "
        >
          <h2 className="font-bold mb-4 text-lg">
            Weekly Revenue
          </h2>

          {/* RESPONSIVE HEIGHT */}
          <div className="h-[260px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#22c55e"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#22c55e"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.1}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  tick={{ fontSize: 12 }}
                  width={40}
                />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART */}
        <div
          className="
            p-4 sm:p-6
            rounded-3xl
            border border-gray-200 dark:border-white/10
            bg-gray-50 dark:bg-[#0a0a0a]
          "
        >
          <h2 className="font-bold mb-4 text-lg">
            Stock Distribution
          </h2>

          <div className="h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  outerRadius={100}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LOW STOCK - PREMIUM MATCHING DESIGN */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="
    relative overflow-hidden
    rounded-[32px]
    border border-black/10 dark:border-white/10
    bg-white/80 dark:bg-[#0a0a0a]/90
    backdrop-blur-xl
    p-5
    shadow-2xl shadow-black/5
  "
>
  {/* BACKGROUND GLOW */}
  <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.03] via-orange-500/[0.03] to-yellow-500/[0.03] pointer-events-none" />

  {/* ORB EFFECT */}
  <div className="absolute -top-20 -left-20 h-60 w-60 bg-red-500/10 blur-3xl" />
  <div className="absolute -bottom-20 -right-20 h-60 w-60 bg-orange-500/10 blur-3xl" />

  {/* HEADER */}
  <div className="relative flex items-center justify-between mb-5">

    <div className="flex items-center gap-3">

      <div
        className="
          h-14 w-14 rounded-3xl
          bg-gradient-to-br from-red-500/20 to-orange-500/20
          text-red-500
          flex items-center justify-center
          text-2xl
          shadow-lg shadow-red-500/10
          border border-red-500/10
        "
      >
        <FaExclamationTriangle />
      </div>

      <div>
        <h2 className="text-2xl font-black tracking-tight">
          Low Stock
        </h2>

        <p className="text-xs text-gray-500 dark:text-white/40">
          Products requiring attention
        </p>
      </div>

    </div>

    <span
      className="
        px-4 py-2 rounded-2xl
        bg-red-500/10
        text-red-500
        text-sm font-bold
        border border-red-500/10
      "
    >
      {lowStockItems.length} Items
    </span>

  </div>

  {/* CONTENT */}
  {lowStockItems.length === 0 ? (

    <div
      className="
        relative rounded-3xl
        border border-dashed border-black/10 dark:border-white/10
        p-10 text-center
        bg-gray-50 dark:bg-white/[0.02]
      "
    >
      <FaBox className="mx-auto text-4xl text-gray-400 mb-4" />

      <h3 className="font-bold text-lg">
        Everything Looks Good
      </h3>

      <p className="text-sm text-gray-500 dark:text-white/50 mt-2">
        No low stock products found
      </p>
    </div>

  ) : (

    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">

      {lowStockItems.map((item) => (

        <motion.div
          key={item.id}
          whileHover={{ y: -3 }}
          className="
            rounded-3xl p-5
            border border-red-500/10
            bg-red-500/[0.04]
            hover:bg-red-500/[0.06]
            transition-all duration-300
          "
        >
          <div className="flex justify-between items-start gap-4">

            {/* LEFT */}
            <div className="min-w-0 flex-1">

              <h3 className="font-black text-lg break-words">
                {item.product_name}
              </h3>

              <div className="flex flex-wrap gap-2 mt-3">

                {/* Bike Type */}
                <span
                  className="
                    px-3 py-1 rounded-full
                    text-xs font-bold
                    bg-blue-500/10 text-blue-500
                  "
                >
                  {item.bike_type}
                </span>

                {/* Quality */}
                <span
                  className="
                    px-3 py-1 rounded-full
                    text-xs font-bold
                    bg-yellow-500/10 text-yellow-500
                  "
                >
                  {item.quality || "Standard"}
                </span>

                {/* Model */}
                <span
                  className="
                    px-3 py-1 rounded-full
                    text-xs font-bold
                    bg-green-500/10 text-green-500
                  "
                >
                  {item.model || "Standard"}
                </span>

              </div>

            </div>

            {/* RIGHT */}
            <div className="shrink-0 text-right">

              <p className="text-xs text-gray-500 dark:text-white/40 mb-1">
                Stock
              </p>

              <p className="text-3xl font-black text-red-500">
                {item.stock}
              </p>

            </div>

          </div>
        </motion.div>

      ))}

    </div>

  )}
</motion.div>

      {/* RECENT BILLS */}
      <div
        className="
          p-6 rounded-3xl
          border border-gray-200 dark:border-white/10
          bg-gray-50 dark:bg-[#0a0a0a]
        "
      >
        <h2 className="font-bold mb-4">Recent Bills</h2>

        <div className="space-y-3">
          {recentBills.length === 0 ? (
            <p className="text-gray-500 dark:text-white/50">
              No recent bills
            </p>
          ) : (
            recentBills.map((bill) => (
              <div
                key={bill.id}
                className="
                  p-4 rounded-2xl
                  bg-gray-100 dark:bg-white/5
                  flex items-center justify-between gap-3
                "
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {bill.client_name}
                  </p>

                  <p className="text-gray-500 dark:text-white/50 text-sm">
                    #{bill.bill_number}
                  </p>
                </div>

                {/* INVOICE BUTTON */}
                <button
                  onClick={() =>
                    navigate(`/invoice/${bill.id}`)
                  }
                  className="
                    flex items-center gap-2
                    px-4 py-2
                    rounded-xl
                    bg-black text-white
                    dark:bg-white dark:text-black
                    hover:scale-105
                    transition-all duration-300
                    shrink-0
                  "
                >
                  <FaFileInvoice />
                  <span className="hidden sm:block">
                    Invoice
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
