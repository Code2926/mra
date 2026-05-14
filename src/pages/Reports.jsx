import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

import {
  FaBox,
  FaWarehouse,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaFileInvoice,
  FaDownload,
  FaTimes,
  FaFire,
  FaChartPie,
  FaCrown,
  FaSearch,
  FaSyncAlt 
} from "react-icons/fa";

import {
  FaArrowTrendUp,
  FaRotateLeft,
} from "react-icons/fa6";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#14b8a6",
  "#f97316",
];

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatNumber = (num) => {
  const value = Number(num || 0);

  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;

  return value.toLocaleString();
};

const formatCurrency = (num) => {
  const value = Number(num || 0);

  if (value >= 1000000000)
    return `${(value / 1000000000).toFixed(1)}B`;

  if (value >= 1000000)
    return `${(value / 1000000).toFixed(1)}M`;

  if (value >= 1000)
    return `${(value / 1000).toFixed(1)}K`;

  return value.toLocaleString();
};

// ─── Card — identical style to Dashboard/Billing/Inventory ───────────────────

const Card = ({ title, value, icon, trend, color, subtitle, danger, iconBg, iconColor }) => (
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
    <div className={`absolute -top-10 -right-10 h-40 w-40 blur-3xl opacity-20 ${color}`} />

    <div className="relative z-10 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-white/50 uppercase truncate">
          {title}
        </p>

        <h2 className=" mt-3 text-xl sm:text-2xl xl:text-3xl font-black break-words leading-tight">
          {value}
        </h2>

        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-white/50 mt-2">{subtitle}</p>
        )}

        {trend && (
          <div
            className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              danger
                ? "bg-red-500/20 text-red-500"
                : "bg-green-500/20 text-green-600 dark:text-green-400"
            }`}
          >
            {!danger && <FaArrowTrendUp size={10} />}
            {trend}
          </div>
        )}
      </div>

      <div
        className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0 ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
    </div>
  </motion.div>
);

// ─── Panel — matches rounded-3xl panel from other pages ─────────────────────

const Panel = ({ children, className = "" }) => (
  <div
    className={`
      p-6 rounded-3xl
      border border-gray-200 dark:border-white/10
      bg-gray-50 dark:bg-[#0a0a0a]
      ${className}
    `}
  >
    {children}
  </div>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="font-bold text-lg">{title}</h2>
    {subtitle && (
      <p className="text-sm text-gray-500 dark:text-white/50 mt-1">{subtitle}</p>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [movements, setMovements] = useState([]);

  // Invoice search
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState(null);

  // Bill table
  const [searchBill, setSearchBill] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [billSort, setBillSort] = useState("newest");

  // Stock movements
  const [movementType, setMovementType] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [bikeFilter, setBikeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  // Export date filter
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  // ─── Data fetch ─────────────────────────────────────────────────────────────

  const fetchReports = async () => {
    try {
      setLoading(true);

      const [productsRes, billsRes, billItemsRes, movementsRes] =
        await Promise.all([
          supabase.from("products").select("*"),

          supabase
            .from("bills")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase.from("bill_items").select(`
            *,
            products (
              id,
              product_name,
              bike_type,
              model,
              quality
            )
          `),

          supabase
            .from("stock_movements")
            .select(`
              *,
              products (
                product_name,
                bike_type,
                model,
                quality
              )
            `)
            .order("created_at", { ascending: false }),
        ]);

      if (
        productsRes.error ||
        billsRes.error ||
        billItemsRes.error ||
        movementsRes.error
      ) {
        throw new Error("Failed loading reports");
      }

      setProducts(productsRes.data || []);
      setBills(billsRes.data || []);
      setBillItems(billItemsRes.data || []);
      setMovements(movementsRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ─── Derived data ────────────────────────────────────────────────────────────

  const totalRevenue = bills.reduce(
    (sum, b) => sum + Number(b.total_amount || 0),
    0
  );

  const totalStock = products.reduce(
    (sum, p) => sum + Number(p.stock || 0),
    0
  );

  const lowStockProducts = products.filter((p) => Number(p.stock || 0) <= 99);

  const todaySales = bills
    .filter((b) => {
      const d = new Date(b.created_at);
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const productSalesMap = {};
  billItems.forEach((item) => {
    const name = item.products?.product_name || "Unknown";
    if (!productSalesMap[name]) productSalesMap[name] = { sold: 0, revenue: 0 };
    productSalesMap[name].sold += Number(item.quantity || 0);
    productSalesMap[name].revenue +=
      Number(item.quantity || 0) * Number(item.price || 0);
  });

  const bestSellingProduct = Object.entries(productSalesMap).sort(
    (a, b) => b[1].sold - a[1].sold
  )[0];

  const productPerformance = products.map((p) => {
    const relatedItems = billItems.filter((i) => i.product_id === p.id);
    const totalSold = relatedItems.reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );
    const revenue = relatedItems.reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.price || 0),
      0
    );
    const added = movements
      .filter((m) => m.product_id === p.id && m.movement_type === "IN")
      .reduce((sum, m) => sum + Number(m.quantity || 0), 0);
    return { ...p, totalSold, revenue, totalAdded: added };
  });

  const deadInventoryCount = products.filter(
    (p) => !billItems.find((i) => i.product_id === p.id)
  ).length;

  const mostProfitable =
    [...productPerformance].sort((a, b) => b.revenue - a.revenue)[0]
      ?.product_name || "N/A";

  const bikeRevenue = {};
  billItems.forEach((item) => {
    const bike = item.products?.bike_type || "Unknown";
    bikeRevenue[bike] =
      (bikeRevenue[bike] || 0) +
      Number(item.quantity || 0) * Number(item.price || 0);
  });

  const bikeChart = Object.entries(bikeRevenue).map(([name, value]) => ({
    name,
    value,
  }));

  const topBikeType =
    [...bikeChart].sort((a, b) => b.value - a.value)[0]?.name || "N/A";

  const salesTrendData = bills
    .slice(0, 15)
    .reverse()
    .map((bill) => ({
      name: new Date(bill.created_at).toLocaleDateString(),
      revenue: Number(bill.total_amount || 0),
    }));

  const clientMap = {};
  bills.forEach((bill) => {
    const name = bill.client_name || "Unknown";
    if (!clientMap[name])
      clientMap[name] = {
        totalBills: 0,
        totalPurchases: 0,
        lastPurchaseDate: bill.created_at,
      };
    clientMap[name].totalBills += 1;
    clientMap[name].totalPurchases += Number(bill.total_amount || 0);
    if (new Date(bill.created_at) > new Date(clientMap[name].lastPurchaseDate))
      clientMap[name].lastPurchaseDate = bill.created_at;
  });

  const clients = Object.entries(clientMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases);

  // ─── Bill table (max 10) ─────────────────────────────────────────────────────

  const top10Bills = useMemo(() => {
    let data = [...bills];

    if (searchBill)
      data = data.filter((b) =>
        b.bill_number?.toLowerCase().includes(searchBill.toLowerCase())
      );

    if (searchClient)
      data = data.filter((b) =>
        b.client_name?.toLowerCase().includes(searchClient.toLowerCase())
      );

    switch (billSort) {
      case "amount":
        data.sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
        break;
      case "oldest":
        data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      default:
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return data.slice(0, 10);
  }, [bills, searchBill, searchClient, billSort]);

  // ─── Movements (max 10) ──────────────────────────────────────────────────────

  const top10Movements = useMemo(() => {
    return movements
      .filter((m) => {
        const matchesProduct = searchProduct
          ? m.products?.product_name
              ?.toLowerCase()
              .includes(searchProduct.toLowerCase())
          : true;
        const matchesMovement = movementType
          ? m.movement_type === movementType
          : true;
        const matchesBike = bikeFilter
          ? m.products?.bike_type === bikeFilter
          : true;
        const matchesModel = modelFilter
          ? m.products?.model === modelFilter
          : true;
        return matchesProduct && matchesMovement && matchesBike && matchesModel;
      })
      .slice(0, 10);
  }, [movements, searchProduct, movementType, bikeFilter, modelFilter]);

  // ─── Export helpers ──────────────────────────────────────────────────────────

  const applyExportQuickFilter = (type) => {
    const now = new Date();
    let start = new Date();
    switch (type) {
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        break;
    }
    setExportFrom(start.toISOString().split("T")[0]);
    setExportTo(now.toISOString().split("T")[0]);
  };

  const filterByExportDate = (data) => {
    if (!exportFrom && !exportTo) return data;
    return data.filter((row) => {
      const date = new Date(row.created_at);
      if (exportFrom && date < new Date(exportFrom)) return false;
      if (exportTo && date > new Date(exportTo + "T23:59:59")) return false;
      return true;
    });
  };

  const exportExcel = (data, fileName) => {
    const filtered = filterByExportDate(data);
    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, `${fileName}.xlsx`);
    toast.success("Excel exported");
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-3xl bg-gray-200 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 text-black dark:text-white transition-colors duration-300 pb-20">

      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black">Reports</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Sales, profit & inventory insights
          </p>
        </div>

        {/* REFRESH */}
        <button
          onClick={fetchReports}
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

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<FaMoneyBillWave />}
          trend="+18%"
          color="bg-green-500"
          iconBg="bg-green-500/15"
          iconColor="text-green-500"
        />
        <Card
          title="Total Bills"
          value={formatNumber(bills.length)}
          icon={<FaFileInvoice />}
          trend="+9%"
          color="bg-blue-500"
          iconBg="bg-blue-500/15"
          iconColor="text-blue-500"
        />
        <Card
          title="Products"
          value={formatNumber(products.length)}
          icon={<FaBox />}
          trend="+4%"
          color="bg-purple-500"
          iconBg="bg-purple-500/15"
          iconColor="text-purple-500"
        />
        <Card
          title="Total Stock"
          value={formatNumber(totalStock)}
          icon={<FaWarehouse />}
          trend="+12%"
          color="bg-cyan-500"
          iconBg="bg-cyan-500/15"
          iconColor="text-cyan-500"
        />
        <Card
          title="Low Stock"
          value={formatNumber(lowStockProducts.length)}
          icon={<FaExclamationTriangle />}
          trend="Alert"
          danger
          color="bg-red-500"
          iconBg="bg-red-500/15"
          iconColor="text-red-500"
        />
        <Card
          title="Today's Sales"
          value={formatCurrency(todaySales)}
          icon={<FaFire />}
          trend="Today"
          color="bg-orange-500"
          iconBg="bg-orange-500/15"
          iconColor="text-orange-500"
        />
        <Card
          title="Best Seller"
          value={bestSellingProduct?.[0] || "N/A"}
          icon={<FaCrown />}
          color="bg-pink-500"
          iconBg="bg-pink-500/15"
          iconColor="text-pink-500"
        />
        <Card
          title="Dead Inventory"
          value={deadInventoryCount}
          icon={<FaBox />}
          trend="Alert"
          danger
          color="bg-red-500"
          iconBg="bg-red-500/15"
          iconColor="text-red-500"
        />
        <Card
          title="Most Profitable"
          value={mostProfitable}
          icon={<FaMoneyBillWave />}
          color="bg-green-500"
          iconBg="bg-green-500/15"
          iconColor="text-green-500"
        />
        <Card
          title="Top Bike Type"
          value={topBikeType}
          icon={<FaChartPie />}
          color="bg-blue-500"
          iconBg="bg-blue-500/15"
          iconColor="text-blue-500"
        />
      </div>

      {/* ── CHARTS ────────────────────────────────────────────────────────── */}
      {/* FIX: lg:grid-cols-2 so charts go side-by-side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Sales Trend */}
        <div className="p-4 sm:p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4 text-lg">Sales Trend</h2>
          <div className="h-[240px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Bike Type */}
        <div className="p-4 sm:p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a]">
          <h2 className="font-bold mb-4 text-lg">Revenue by Bike Type</h2>
          <div className="h-[240px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bikeChart} barSize={32} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {bikeChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── EXPORT REPORTS ────────────────────────────────────────────────── */}
      <Panel>
        <SectionHeader title="Export Reports" subtitle="Download data filtered by date range" />

        {/* FIX: Date inputs stack on mobile, row on sm+ */}
        {/* Date + Quick Filters (ONE ROW ON DESKTOP) */}
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

  {/* Date Inputs */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

    <div className="flex items-center gap-2 w-full sm:w-auto">
      <label className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase shrink-0">
        From
      </label>
      <input
        type="date"
        value={exportFrom}
        onChange={(e) => setExportFrom(e.target.value)}
        className="flex-1 sm:flex-none rounded-2xl px-4 py-3 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm"
      />
    </div>

    <div className="flex items-center gap-2 w-full sm:w-auto">
      <label className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase shrink-0">
        To
      </label>
      <input
        type="date"
        value={exportTo}
        onChange={(e) => setExportTo(e.target.value)}
        className="flex-1 sm:flex-none rounded-2xl px-4 py-3 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm"
      />
    </div>
  </div>

  {/* Quick Filters */}
  <div className="flex flex-wrap gap-2 sm:gap-3">

    <button
      onClick={() => applyExportQuickFilter("week")}
      className="px-4 py-2.5 rounded-2xl bg-blue-500/10 text-blue-500 font-bold text-sm hover:bg-blue-500/20 transition"
    >
      Week
    </button>

    <button
      onClick={() => applyExportQuickFilter("month")}
      className="px-4 py-2.5 rounded-2xl bg-green-500/10 text-green-500 font-bold text-sm hover:bg-green-500/20 transition"
    >
      Month
    </button>

    <button
      onClick={() => applyExportQuickFilter("year")}
      className="px-4 py-2.5 rounded-2xl bg-purple-500/10 text-purple-500 font-bold text-sm hover:bg-purple-500/20 transition"
    >
      Year
    </button>

    {(exportFrom || exportTo) && (
      <button
        onClick={() => {
          setExportFrom("");
          setExportTo("");
        }}
        className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 font-bold text-sm flex items-center gap-2 hover:scale-105 transition"
      >
        <FaRotateLeft size={12} />
        Clear
      </button>
    )}

  </div>

</div>

        {/* FIX: 2 cols on mobile, 4 on xl */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => exportExcel(bills, "sales-report")}
            className="p-4 sm:p-5 rounded-3xl bg-green-500 text-black font-black flex items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            <FaDownload />
            Sales Report
          </button>
          <button
            onClick={() => exportExcel(movements, "stock-report")}
            className="p-4 sm:p-5 rounded-3xl bg-blue-500 text-white font-black flex items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            <FaDownload />
            Stock Report
          </button>
          <button
            onClick={() => exportExcel(productPerformance, "product-report")}
            className="p-4 sm:p-5 rounded-3xl bg-yellow-500 text-black font-black flex items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            <FaDownload />
            Product Report
          </button>
          <button
            onClick={() => exportExcel(clients, "client-report")}
            className="p-4 sm:p-5 rounded-3xl bg-purple-500 text-white font-black flex items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            <FaDownload />
            Client Report
          </button>
        </div>
      </Panel>

      {/* ── INVOICE SEARCH ────────────────────────────────────────────────── */}
      <Panel>
        <SectionHeader title="Invoice Search Tool" subtitle="Find any invoice by bill number" />

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            placeholder="Enter bill number..."
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const result = bills.find((b) =>
                  b.bill_number?.toLowerCase().includes(invoiceSearch.toLowerCase())
                );
                if (!result) return toast.error("Invoice not found");
                setSelectedInvoice(result);
              }
            }}
            className="flex-1 rounded-2xl px-5 py-4 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm"
          />
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => {
                const result = bills.find((b) =>
                  b.bill_number?.toLowerCase().includes(invoiceSearch.toLowerCase())
                );
                if (!result) return toast.error("Invoice not found");
                setSelectedInvoice(result);
              }}
              className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-green-500 text-black font-black flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 text-sm"
            >
              <FaSearch />
              Search
            </button>
            <button
              onClick={() => { setInvoiceSearch(""); setSelectedInvoice(null); }}
              className="flex-1 sm:flex-none px-5 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 text-sm"
            >
              <FaRotateLeft />
              Reset
            </button>
          </div>
        </div>

        <AnimatePresence>
          {selectedInvoice && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="mt-5 rounded-3xl border border-gray-200 dark:border-white/10 p-4 sm:p-5 bg-gray-100 dark:bg-black/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black truncate">{selectedInvoice.client_name}</h3>
                  <p className="text-gray-500 dark:text-white/50 mt-1 text-sm">
                    {selectedInvoice.bill_number}
                  </p>
                  <p className="mt-3 text-2xl sm:text-3xl font-black">
                    {formatCurrency(selectedInvoice.total_amount)}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/invoice/${selectedInvoice.id}`)}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-blue-500 text-white font-black hover:scale-105 transition-all duration-300 text-sm"
                >
                  Open Invoice
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* ── BILL REPORTS ──────────────────────────────────────────────────── */}
      <Panel>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div className="text-left">
            <h2 className="font-bold text-lg">Bill Reports</h2>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            Latest 10 bills based on selected sort
            </p>
          </div>

          {/* FIX: filters stack on mobile, row on lg */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:justify-end">
            <input
              placeholder="Bill number..."
              value={searchBill}
              onChange={(e) => setSearchBill(e.target.value)}
              className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm w-full sm:w-44"
            />
            <input
              placeholder="Client name..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm w-full sm:w-44"
            />
            <select
              value={billSort}
              onChange={(e) => setBillSort(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm w-full sm:w-auto"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="amount">Highest Amount</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10 -mx-4 sm:mx-0">
          <div className="min-w-[650px] lg:min-w-0 px-4 sm:px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-left">
                  {["Bill", "Client", "Amount", "Date", "Actions"].map((h) => (
                    <th key={h} className="py-3 px-3 text-xs uppercase font-bold text-gray-500 dark:text-white/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10Bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-3 font-bold text-sm">{bill.bill_number}</td>
                    <td className="py-4 px-3 text-sm">{bill.client_name}</td>
                    <td className="py-4 px-3 font-semibold text-sm">{formatCurrency(bill.total_amount)}</td>
                    <td className="py-4 px-3 text-xs text-gray-500 dark:text-white/50">
                      {new Date(bill.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 sm:py-4 sm:px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoice/${bill.id}`)}
                          className="px-3 py-2 rounded-xl bg-green-500 text-black font-bold text-xs hover:scale-105 transition-all duration-300"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setInvoiceModal(bill)}
                          className="px-3 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs hover:scale-105 transition-all duration-300"
                        >
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* ── STOCK MOVEMENTS ───────────────────────────────────────────────── */}
      <Panel>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-lg">Stock Movements</h2>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
              Latest 10 inventory movements
            </p>
          </div>
          {/* FIX: filters wrap properly on mobile */}
          <div className="flex flex-wrap gap-2">
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm flex-1 sm:flex-none"
            >
              <option value="">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <input
              placeholder="Search product..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 outline-none text-sm flex-1 sm:w-40 sm:flex-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto overscroll-x-contain scrollbar-hide -mx-2 sm:mx-0">
          <div className="min-w-[760px] sm:min-w-[900px] px-2 sm:px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-left">
                  {[
                    "Movement","Product","Bike","Model",
                    "Quality","Qty","Prev","New",
                    "Reference","Note","Time",
                  ].map((h) => (
                    <th key={h} className="py-3 px-3 text-xs uppercase font-bold text-gray-500 dark:text-white/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10Movements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2 px-2 sm:py-4 sm:px-3">
                      <span
                      className={`w-14 h-8 flex items-center justify-center rounded-xl text-xs font-bold ${
                        m.movement_type === "IN"
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-red-500/20 text-red-500"
                        }`}
                        >
                          {m.movement_type}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-semibold text-sm">{m.products?.product_name}</td>
                    <td className="py-4 px-3 text-sm">{m.products?.bike_type}</td>
                    <td className="py-4 px-3 text-sm">{m.products?.model}</td>
                    <td className="py-4 px-3 text-sm">{m.products?.quality}</td>
                    <td className="py-4 px-3 font-bold text-sm whitespace-nowrap">{formatNumber(m.quantity)}</td>
                    <td className="py-4 px-3 text-gray-500 dark:text-white/50 text-sm">{formatNumber(m.previous_stock)}</td>
                    <td className="py-4 px-3 text-sm whitespace-nowrap">{formatNumber(m.new_stock)}</td>
                    <td className="py-4 px-3 text-xs">{m.reference_type}</td>
                    <td className="py-4 px-3 text-xs text-gray-500 dark:text-white/50">{m.note}</td>
                    <td className="py-4 px-3 text-xs text-gray-500 dark:text-white/50">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* ── PRODUCT PERFORMANCE ───────────────────────────────────────────── */}
      <Panel>
        <div className="mb-5">
          <h2 className="font-bold text-lg">Product Performance</h2>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            Full product sales and revenue breakdown
          </p>
        </div>

        <div className="overflow-auto -mx-4 sm:mx-0">
          <div className="min-w-[720px] sm:min-w-[800px] px-2 sm:px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-left">
                  {[
                    "Product","Bike","Model","Quality",
                    "Stock","Total Sold","Total Added","Revenue",
                  ].map((h) => (
                    <th key={h} className="py-3 px-3 text-xs uppercase font-bold text-gray-500 dark:text-white/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productPerformance.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-3 font-bold text-sm">{p.product_name}</td>
                    <td className="py-4 px-3 text-sm">{p.bike_type}</td>
                    <td className="py-4 px-3 text-sm">{p.model}</td>
                    <td className="py-4 px-3 text-sm">{p.quality}</td>
                    <td className="py-4 px-3 text-sm whitespace-nowrap">{formatNumber(p.stock)}</td>
                    <td className="py-4 px-3 text-sm whitespace-nowrap">{formatNumber(p.totalSold)}</td>
                    <td className="py-4 px-3 text-sm whitespace-nowrap">{formatNumber(p.totalAdded)}</td>
                    <td className="py-4 px-3 font-semibold text-sm">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* ── CLIENT LEADERBOARD ────────────────────────────────────────────── */}
      <Panel>
        <div className="mb-5">
          <h2 className="font-bold text-lg">Client Leaderboard</h2>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            Top clients by total spend
          </p>
        </div>

        <div className="space-y-3">
          {clients.map((client, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -3 }}
              className="
                p-3 sm:p-4 rounded-2xl
                bg-gray-100 dark:bg-white/5
                flex items-center justify-between gap-3
              "
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className={`
                    h-10 w-10 sm:h-12 sm:w-12 rounded-2xl shrink-0
                    flex items-center justify-center
                    font-black text-sm sm:text-base
                    ${index === 0
                      ? "bg-yellow-500/20 text-yellow-500"
                      : index === 1
                      ? "bg-gray-400/20 text-gray-400"
                      : index === 2
                      ? "bg-orange-700/20 text-orange-700"
                      : "bg-green-500/15 text-green-500"}
                  `}
                >
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm sm:text-base">{client.name}</p>
                  <p className="text-gray-500 dark:text-white/50 text-xs sm:text-sm">
                    {client.totalBills} Bills
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-black text-base sm:text-lg">
                  {formatCurrency(client.totalPurchases)}
                </p>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                  Last: {new Date(client.lastPurchaseDate).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* ── INVOICE MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {invoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setInvoiceModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="
                w-full sm:max-w-2xl
                rounded-t-3xl sm:rounded-3xl
                border border-white/10
                bg-[#0a0a0a]
                p-5 sm:p-6
                max-h-[90vh] overflow-y-auto
              "
            >
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Invoice Preview</h2>
                <button
                  onClick={() => setInvoiceModal(null)}
                  className="h-10 w-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-5 text-white">
                <div>
                  <p className="text-sm text-white/50">Bill Number</p>
                  <h3 className="text-xl sm:text-2xl font-black mt-1">{invoiceModal.bill_number}</h3>
                </div>
                <div>
                  <p className="text-sm text-white/50">Client Name</p>
                  <h3 className="text-lg sm:text-xl font-bold mt-1">{invoiceModal.client_name}</h3>
                </div>
                <div>
                  <p className="text-sm text-white/50">Total Amount</p>
                  <h3 className="text-3xl sm:text-4xl font-black mt-1 text-green-400">
                    {formatCurrency(invoiceModal.total_amount)}
                  </h3>
                </div>
                <div>
                  <p className="text-sm text-white/50">Created At</p>
                  <h3 className="text-base sm:text-lg font-semibold mt-1">
                    {new Date(invoiceModal.created_at).toLocaleString()}
                  </h3>
                </div>
                <button
                  onClick={() => navigate(`/invoice/${invoiceModal.id}`)}
                  className="w-full py-4 rounded-2xl bg-green-500 text-black font-black hover:scale-105 transition-all duration-300 mt-4"
                >
                  Open Full Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
