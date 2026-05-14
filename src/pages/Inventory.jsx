import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import {
  FaBox,
  FaWarehouse,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
} from "react-icons/fa";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [search, setSearch] = useState("");
  const [bikeFilter, setBikeFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const formatNumber = (num) => {
    const value = Number(num) || 0;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value;
  };

  const bikeTypes = [...new Set(items.map((p) => p.bike_type).filter(Boolean))];
  const qualities = [...new Set(items.map((p) => p.quality).filter(Boolean))];
  const models = [...new Set(items.map((p) => p.model).filter(Boolean))];

  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      const matchesSearch = `${p.product_name} ${p.bike_type} ${p.quality} ${p.model || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesBike = bikeFilter ? p.bike_type === bikeFilter : true;
      const matchesQuality = qualityFilter ? p.quality === qualityFilter : true;
      const matchesModel = modelFilter ? p.model === modelFilter : true;
      return matchesSearch && matchesBike && matchesQuality && matchesModel;
    });
  }, [items, search, bikeFilter, qualityFilter, modelFilter]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, product_name, bike_type, quality, model, stock")
      .order("bike_type", { ascending: true });

    if (error) {
      toast.error("Failed to load inventory");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addStock = async (item) => {
    const value = parseInt(inputs[item.id], 10);
    if (!value || value <= 0) {
      return toast.error("Enter valid quantity");
    }

    const previousStock = Number(item.stock || 0);
    const newStock = previousStock + value;

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.id);

    if (stockError) {
      return toast.error("Stock update failed");
    }

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert([
        {
          product_id: item.id,
          movement_type: "IN",
          quantity: value,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: "manual",
          note: "Manual stock added from inventory page",
        },
      ]);

    if (movementError) {
      console.error(movementError);
      await supabase
        .from("products")
        .update({ stock: previousStock })
        .eq("id", item.id);
      return toast.error("Movement log failed");
    }

    toast.success("Stock Added");
    setInputs((prev) => ({ ...prev, [item.id]: "" }));
    fetchItems();
  };

  const deductStock = async (item) => {
    const value = parseInt(inputs[item.id], 10);
    if (!value || value <= 0) {
      return toast.error("Enter valid quantity");
    }

    const previousStock = Number(item.stock || 0);
    if (previousStock - value < 0) {
      return toast.error("Not enough stock");
    }

    const newStock = previousStock - value;

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.id);

    if (stockError) {
      return toast.error("Stock update failed");
    }

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert([
        {
          product_id: item.id,
          movement_type: "OUT",
          quantity: value,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: "manual",
          note: "Manual stock deducted from inventory page",
        },
      ]);

    if (movementError) {
      console.error(movementError);
      await supabase
        .from("products")
        .update({ stock: previousStock })
        .eq("id", item.id);
      return toast.error("Movement log failed");
    }

    toast.success("Stock Deducted");
    setInputs((prev) => ({ ...prev, [item.id]: "" }));
    fetchItems();
  };

  const totalStock = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);

  const LOW_STOCK_THRESHOLD = 99;

  const getStockStatus = (stock) => {
    const s = Number(stock || 0);
    return {
      low: s > 0 && s <= LOW_STOCK_THRESHOLD,
      out: s === 0,
    };
  };

  const lowStockItems = items.filter((item) => {
    const status = getStockStatus(item.stock);
    return status.low || status.out;
  });

  return (
    <div className="space-y-8 text-black dark:text-white pb-20">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tight leading-none">
            Inventory
          </h1>
          <p className="text-gray-500 dark:text-white/40 mt-3 text-sm">
            Manage products, stock, models & quality
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* PRODUCTS */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          className="
            relative overflow-hidden rounded-[28px]
            border border-black/10 dark:border-white/10
            bg-white/80 dark:bg-[#0d0d0d]/90
            backdrop-blur-xl
            p-7
            shadow-xl shadow-black/5
          "
        >
          <div className="absolute -top-12 -right-12 h-44 w-44 blur-3xl opacity-15 bg-blue-500" />

          <div className="relative z-10 flex justify-between gap-4 items-start">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-white/40 font-semibold">
                Total Products
              </p>

              <h2 className="text-3xl font-black mt-3 leading-tight">
                {formatNumber(items.length)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-xl shrink-0 text-blue-500">
              <FaBox />
            </div>
          </div>
        </motion.div>

        {/* STOCK */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          className="
            relative overflow-hidden rounded-[28px]
            border border-black/10 dark:border-white/10
            bg-white/80 dark:bg-[#0d0d0d]/90
            backdrop-blur-xl
            p-7
            shadow-xl shadow-black/5
          "
        >
          <div className="absolute -top-12 -right-12 h-44 w-44 blur-3xl opacity-15 bg-green-500" />

          <div className="relative z-10 flex justify-between gap-4 items-start">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-white/40 font-semibold">
                Total Stock
              </p>

              <h2 className="text-3xl font-black mt-3 leading-tight">
                {formatNumber(totalStock)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-xl shrink-0 text-green-500">
              <FaWarehouse />
            </div>
          </div>
        </motion.div>

        {/* LOW STOCK */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          className="
            relative overflow-hidden rounded-[28px]
            border border-red-500/20 dark:border-red-500/20
            bg-red-500/[0.03] dark:bg-red-500/[0.03]
            backdrop-blur-xl
            p-7
            shadow-xl shadow-black/5
          "
        >
          <div className="absolute -top-12 -right-12 h-44 w-44 blur-3xl opacity-15 bg-red-500" />

          <div className="relative z-10 flex justify-between gap-4 items-start">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-white/40 font-semibold">
                Low Stock
              </p>

              <h2 className="text-3xl font-black mt-3 leading-tight text-red-500">
                {formatNumber(lowStockItems.length)}
              </h2>
              {/* ADD THIS - TREND INDICATOR */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500">
                <FaExclamationTriangle />
                Alert
              </div>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-xl shrink-0 text-red-500">
              <FaExclamationTriangle />
            </div>
          </div>
        </motion.div>
      </div>

      {/* SEARCH & FILTER SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="
          relative overflow-hidden rounded-[28px]
          border border-black/10 dark:border-white/10
          bg-white/80 dark:bg-[#0d0d0d]/90
          backdrop-blur-xl
          p-7
          shadow-xl shadow-black/5
        "
      >
        {/* BACKGROUND GLOW */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.03] to-cyan-500/[0.03] pointer-events-none" />

        {/* ORB GLOW */}
        <div className="absolute -top-20 -left-20 h-60 w-60 bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-60 w-60 bg-purple-500/10 blur-3xl" />

        {/* HEADER */}
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-500 flex items-center justify-center text-2xl border border-blue-500/10">
              <FaFilter />
            </div>

            <div>
              <h3 className="text-2xl font-black tracking-tight">
                Search & Filters
              </h3>

              <p className="text-xs text-gray-500 dark:text-white/40">
                Quickly filter inventory data
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setBikeFilter("");
              setQualityFilter("");
              setModelFilter("");
            }}
            className="
              px-6 py-3 rounded-2xl
              bg-red-500/10 hover:bg-red-500/20
              text-red-500 font-bold text-sm
              transition-all duration-300
              border border-red-500/10
              hover:scale-105
              whitespace-nowrap
            "
          >
            Clear Filters
          </button>
        </div>

        {/* FILTER GRID */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* SEARCH */}
          <div className="group flex items-center gap-3 px-5 py-4 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-100/50 dark:bg-white/[0.03] focus-within:border-blue-500/40 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all duration-300">
            <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg group-focus-within:scale-110 transition-all duration-300">
              <FaSearch />
            </div>

            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-white/40 mb-1">
                Search Product
              </p>

              <input
                type="text"
                placeholder="Type product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* BIKE TYPE */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-gray-100/50 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-blue-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Bike Type
            </p>

            <select
              value={bikeFilter}
              onChange={(e) => setBikeFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold dark:text-white"
            >
              <option value="">All Bike Types</option>
              {bikeTypes.map((type, index) => (
                <option key={index} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* QUALITY */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-gray-100/50 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-yellow-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Product Quality
            </p>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold dark:text-white"
            >
              <option value="">All Qualities</option>
              {qualities.map((quality, index) => (
                <option key={index} value={quality}>
                  {quality}
                </option>
              ))}
            </select>
          </div>

          {/* MODEL */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-gray-100/50 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-green-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Product Model
            </p>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold dark:text-white"
            >
              <option value="">All Models</option>
              {models.map((model, index) => (
                <option key={index} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* PRODUCTS GRID */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-[28px] bg-black/5 dark:bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const lowStock = Number(item.stock || 0) <= LOW_STOCK_THRESHOLD;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -5, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`
                  relative overflow-hidden rounded-[28px]
                  border p-7
                  transition-all duration-300
                  ${
                    lowStock
                      ? "border-red-500/20 bg-red-500/[0.04]"
                      : "border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0d0d0d]/90"
                  }
                  backdrop-blur-xl
                  shadow-xl shadow-black/5
                `}
              >
                {/* GLOW */}
                <div
                  className={`
                    absolute -top-12 -right-12 h-44 w-44 blur-3xl opacity-15
                    ${lowStock ? "bg-red-500" : "bg-blue-500"}
                  `}
                />

                <div className="relative z-10">
                  {/* TOP */}
                  <div className="flex justify-between items-start gap-3 mb-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-black leading-tight break-words">
                        {item.product_name}
                      </h2>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
                          {item.bike_type}
                        </span>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500">
                          {item.quality}
                        </span>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500">
                          {item.model || "NEW"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`
                        px-4 py-2 rounded-2xl font-black text-lg shrink-0
                        ${
                          lowStock
                            ? "bg-red-500/10 text-red-500"
                            : "bg-green-500/10 text-green-500"
                        }
                      `}
                    >
                      {formatNumber(item.stock)}
                    </div>
                  </div>

                  {/* INPUT */}
                  <div className="mb-4">
                    <input
                      type="number"
                      placeholder="Enter quantity"
                      value={inputs[item.id] || ""}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="
                        w-full rounded-2xl px-4 py-3
                        outline-none border border-black/10 dark:border-white/10
                        bg-gray-100 dark:bg-black/20
                        text-black dark:text-white
                        placeholder:text-gray-400 dark:placeholder:text-gray-600
                        transition-all duration-300
                        focus:border-blue-500/40 focus:shadow-lg focus:shadow-blue-500/10
                      "
                    />
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => addStock(item)}
                      className="
                        flex-1 py-3 rounded-2xl
                        bg-green-500 hover:bg-green-600
                        text-black font-black
                        transition-all duration-300
                        flex items-center justify-center gap-2
                        hover:scale-105
                      "
                    >
                      <FaArrowUp />
                      Add
                    </button>

                    <button
                      onClick={() => deductStock(item)}
                      className="
                        flex-1 py-3 rounded-2xl
                        bg-red-500 hover:bg-red-600
                        text-black font-black
                        transition-all duration-300
                        flex items-center justify-center gap-2
                        hover:scale-105
                      "
                    >
                      <FaArrowDown />
                      Deduct
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full rounded-[28px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0d0d0d]/90 backdrop-blur-xl p-16 text-center">
              <p className="text-lg font-bold text-gray-500 dark:text-white/40">
                No products found
              </p>

              <p className="text-sm text-gray-400 dark:text-white/30 mt-2">
                Try changing search or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
