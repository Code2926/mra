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

  /* SEARCH + FILTERS */
  const [bikeFilter, setBikeFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  /* FORMAT NUMBERS */
  const formatNumber = (num) => {
    const value = Number(num) || 0;

    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;

    return value;
  };

  /* UNIQUE FILTER OPTIONS (FIXED: items not products) */
  const bikeTypes = [
    ...new Set(items.map((p) => p.bike_type).filter(Boolean)),
  ];

  const qualities = [
    ...new Set(items.map((p) => p.quality).filter(Boolean)),
  ];

  const models = [
    ...new Set(items.map((p) => p.model).filter(Boolean)),
  ];

  /* FILTER PRODUCTS (FIXED: items not products) */
  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      const matchesSearch = `${p.product_name} ${p.bike_type} ${
        p.quality
      } ${p.model || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesBike = bikeFilter ? p.bike_type === bikeFilter : true;
      const matchesQuality = qualityFilter ? p.quality === qualityFilter : true;
      const matchesModel = modelFilter ? p.model === modelFilter : true;

      return matchesSearch && matchesBike && matchesQuality && matchesModel;
    });
  }, [items, search, bikeFilter, qualityFilter, modelFilter]);

  /* FETCH PRODUCTS */
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
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* UPDATE STOCK */
  const updateStock = async (id, newStock) => {
    if (newStock < 0) return;

    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", id);

    if (error) toast.error("Stock update failed");
  };

  /* ADD STOCK */
  const addStock = async (item) => {
    const value = parseInt(inputs[item.id] || 0);

    if (!value || value <= 0) {
      return toast.error("Enter valid quantity");
    }

    await updateStock(item.id, item.stock + value);
    toast.success("Stock Added");

    setInputs({ ...inputs, [item.id]: "" });
  };

  /* DEDUCT STOCK */
  const deductStock = async (item) => {
    const value = parseInt(inputs[item.id] || 0);

    if (!value || value <= 0) {
      return toast.error("Enter valid quantity");
    }

    if (item.stock - value < 0) {
      return toast.error("Not enough stock");
    }

    await updateStock(item.id, item.stock - value);
    toast.success("Stock Deducted");

    setInputs({ ...inputs, [item.id]: "" });
  };

  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.stock || 0),
    0
  );

  const lowStockItems = items.filter((item) => item.stock <= 5);

  return (
    <div className="space-y-6 text-black dark:text-white">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-4xl font-black">Inventory</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Manage products, stock, models & quality
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="col-span-full xl:col-span-3">

        {/* CARD 1 */}
        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Total Products</div>
            <div className="text-4xl font-black mt-3">{items.length}</div>
          </div>
          <FaBox className="text-blue-500 text-3xl" />
        </motion.div>

        {/* CARD 2 */}
        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Total Stock</div>
            <div className="text-4xl font-black mt-3">{totalStock}</div>
          </div>
          <FaWarehouse className="text-green-500 text-3xl" />
        </motion.div>

        {/* CARD 3 */}
        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Low Stock</div>
            <div className="text-4xl font-black mt-3 text-red-500">
              {lowStockItems.length}
            </div>
          </div>
          <FaExclamationTriangle className="text-red-500 text-3xl" />
        </motion.div>

        {/* PREMIUM SEARCH + FILTER BAR */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[32px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/5"
      >
        {/* GLOW */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.03] to-cyan-500/[0.03] pointer-events-none" />

        {/* TOP */}
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10 border border-blue-500/10">
              <FaFilter />
            </div>

            <div>
              <h3 className="text-2xl font-black tracking-tight">
                Search & Filters
              </h3>
            </div>
          </div>

          {/* CLEAR FILTERS */}
          <button
            onClick={() => {
              setSearch("");
              setBikeFilter("");
              setQualityFilter("");
              setModelFilter("");
            }}
            className="px-5 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-all duration-300 border border-red-500/10 hover:scale-[1.02]"
          >
            Clear Filters
          </button>
        </div>

        {/* FILTER GRID */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* SEARCH */}
          <div className="group flex items-center gap-3 px-5 py-4 rounded-3xl border border-black/10 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.03] focus-within:border-blue-500/40 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all duration-300">
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
                className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* BIKE TYPE */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-blue-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Bike Type
            </p>

            <select
              value={bikeFilter}
              onChange={(e) => setBikeFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold"
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
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-yellow-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Product Quality
            </p>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold"
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
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-green-500/20">
            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
              Product Model
            </p>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-semibold"
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

      </div>

      {/* ITEMS */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[320px] rounded-3xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

          {filteredItems.map((item) => {
            const lowStock = item.stock <= 5;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                className={`rounded-3xl p-5 border ${
                  lowStock
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-black/10 dark:border-white/10"
                }`}
              >

                <h2 className="font-black text-xl">{item.product_name}</h2>

                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-blue-500">{item.bike_type}</span>
                  <span className="text-yellow-500">{item.quality}</span>
                  <span className="text-green-500">{item.model}</span>
                </div>

                <div className="text-2xl font-black mt-3">
                  {item.stock}
                </div>

                <input
                  type="number"
                  value={inputs[item.id] || ""}
                  onChange={(e) =>
                    setInputs({
                      ...inputs,
                      [item.id]: e.target.value,
                    })
                  }
                  className="w-full mt-4 p-3 rounded-xl bg-gray-100 dark:bg-black/30"
                  placeholder="Qty"
                />

                <div className="flex gap-3 mt-4">

                  <button
                    onClick={() => addStock(item)}
                    className="flex-1 bg-green-500 py-2 rounded-xl flex items-center justify-center gap-2"
                  >
                    <FaArrowUp /> Add
                  </button>

                  <button
                    onClick={() => deductStock(item)}
                    className="flex-1 bg-red-500 py-2 rounded-xl flex items-center justify-center gap-2"
                  >
                    <FaArrowDown /> Deduct
                  </button>

                </div>

              </motion.div>
            );
          })}

        </div>
      )}

    </div>
  );
}
