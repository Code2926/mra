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
  const value = Number(inputs[item.id]);

  if (!value || value <= 0) {
    return toast.error("Enter valid quantity");
  }

  const previousStock = Number(item.stock || 0);
  const newStock = previousStock + value;

  /* UPDATE PRODUCT STOCK */
  const { error: stockError } = await supabase
    .from("products")
    .update({
      stock: newStock,
    })
    .eq("id", item.id);

  if (stockError) {
    return toast.error("Stock update failed");
  }

  /* CREATE MOVEMENT LOG */
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

  // rollback stock
  await supabase
    .from("products")
    .update({
      stock: previousStock,
    })
    .eq("id", item.id);

  return toast.error("Movement log failed");
}

  toast.success("Stock Added");

  setInputs({
    ...inputs,
    [item.id]: "",
  });

  fetchItems();
};

  const deductStock = async (item) => {
  const value = Number(inputs[item.id]);

  if (!value || value <= 0) {
    return toast.error("Enter valid quantity");
  }

  const previousStock = Number(item.stock || 0);

  if (previousStock - value < 0) {
    return toast.error("Not enough stock");
  }

  const newStock = previousStock - value;

  /* UPDATE PRODUCT STOCK */
  const { error: stockError } = await supabase
    .from("products")
    .update({
      stock: newStock,
    })
    .eq("id", item.id);

  if (stockError) {
    return toast.error("Stock update failed");
  }

  /* CREATE MOVEMENT LOG */
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

  // rollback stock
  await supabase
    .from("products")
    .update({
      stock: previousStock,
    })
    .eq("id", item.id);

  return toast.error("Movement log failed");
}

  toast.success("Stock Deducted");

  setInputs({
    ...inputs,
    [item.id]: "",
  });

  fetchItems();
};

  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.stock || 0),
    0
  );

  const lowStockItems = items.filter((item) => item.stock <= 99);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* PRODUCTS */}
        <motion.div
          whileHover={{ y: -5 }}
          className="
            rounded-3xl
            border border-black/10 dark:border-white/10
            bg-white dark:bg-[#0a0a0a]
            p-5
            relative overflow-hidden
          "
        >

          <div className="absolute -top-10 -right-10 h-40 w-40 bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex justify-between">

            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Total Products
              </p>

              <h2 className="text-4xl font-black mt-3 break-words">
                {formatNumber(items.length)}
              </h2>
            </div>

            <div
              className="
                h-14 w-14 rounded-2xl
                bg-blue-500/10
                text-blue-500
                flex items-center justify-center
                text-xl
              "
            >
              <FaBox />
            </div>

          </div>

        </motion.div>

        {/* STOCK */}
        <motion.div
          whileHover={{ y: -5 }}
          className="
            rounded-3xl
            border border-black/10 dark:border-white/10
            bg-white dark:bg-[#0a0a0a]
            p-5
            relative overflow-hidden
          "
        >

          <div className="absolute -top-10 -right-10 h-40 w-40 bg-green-500/10 blur-3xl" />

          <div className="relative z-10 flex justify-between">

            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Total Stock
              </p>

              <h2 className="text-4xl font-black mt-3 break-words">
                {formatNumber(totalStock)}
              </h2>
            </div>

            <div
              className="
                h-14 w-14 rounded-2xl
                bg-green-500/10
                text-green-500
                flex items-center justify-center
                text-xl
              "
            >
              <FaWarehouse />
            </div>

          </div>

        </motion.div>

        {/* LOW STOCK */}
        <motion.div
          whileHover={{ y: -5 }}
          className="
            rounded-3xl
            border border-red-500/20
            bg-white dark:bg-[#0a0a0a]
            p-5
            relative overflow-hidden
          "
        >

          <div className="absolute -top-10 -right-10 h-40 w-40 bg-red-500/10 blur-3xl" />

          <div className="relative z-10 flex justify-between">

            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Low Stock
              </p>

              <h2 className="text-4xl font-black mt-3 break-words text-red-500">
                {formatNumber(lowStockItems.length)}
              </h2>
            </div>

            <div
              className="
                h-14 w-14 rounded-2xl
                bg-red-500/10
                text-red-500
                flex items-center justify-center
                text-xl
              "
            >
              <FaExclamationTriangle />
            </div>

          </div>

        </motion.div>

       {/* FIXED: SEARCH + FILTER BAR */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="col-span-full relative overflow-hidden rounded-[32px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/5"
>
  {/* BACKGROUND GLOW */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.03] to-cyan-500/[0.03] pointer-events-none" />

  {/* EXTRA SOFT ORB GLOW */}
  <div className="absolute -top-20 -left-20 h-60 w-60 bg-blue-500/10 blur-3xl" />
  <div className="absolute -bottom-20 -right-20 h-60 w-60 bg-purple-500/10 blur-3xl" />

  {/* TOP SECTION */}
  <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">

    <div className="flex items-center gap-3">

      <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10 border border-blue-500/10">
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
            <div
              key={i}
              className="
                h-[320px]
                rounded-3xl
                bg-black/5 dark:bg-white/5
                animate-pulse
              "
            />
          ))}

        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

          {filteredItems.map((item) => {
            const lowStock = item.stock <= 99;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                className={`
                  relative overflow-hidden
                  rounded-3xl
                  border
                  p-5
                  transition-all duration-300

                  ${
                    lowStock
                      ? "border-red-500/20 bg-red-500/[0.04]"
                      : "border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a]"
                  }
                `}
              >

                {/* GLOW */}
                <div
                  className={`
                    absolute -top-10 -right-10
                    h-40 w-40 blur-3xl opacity-20

                    ${
                      lowStock
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }
                  `}
                />

                <div className="relative z-10">

                  {/* TOP */}
                  <div className="flex justify-between items-start gap-3">

                    <div className="min-w-0">

                      <h2
                        className="
                          text-xl font-black
                          leading-tight
                          break-words
                        "
                      >
                        {item.product_name}
                      </h2>

                      <div className="flex flex-wrap gap-2 mt-3">

                        <span
                          className="
                            px-3 py-1 rounded-full
                            text-xs font-bold
                            bg-blue-500/10 text-blue-500
                          "
                        >
                          {item.bike_type}
                        </span>

                        <span
                          className="
                            px-3 py-1 rounded-full
                            text-xs font-bold
                            bg-yellow-500/10 text-yellow-500
                          "
                        >
                          {item.quality}
                        </span>

                        <span
                          className="
                            px-3 py-1 rounded-full
                            text-xs font-bold
                            bg-green-500/10 text-green-500
                          "
                        >
                          {item.model || "NEW"}
                        </span>

                      </div>

                    </div>

                    <div
                      className={`
                        px-4 py-2 rounded-2xl
                        font-black text-xl

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
                  <div className="mt-6">

                    <input
                      type="number"
                      placeholder="Enter quantity"
                      value={inputs[item.id] || ""}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [item.id]: e.target.value,
                        })
                      }
                      className="
                        w-full
                        rounded-2xl
                        px-4 py-3
                        outline-none
                        border border-black/10 dark:border-white/10
                        bg-gray-100 dark:bg-black/30
                        text-black dark:text-white
                        placeholder:text-gray-400
                      "
                    />

                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-3 mt-5">

                    <button
                      onClick={() => addStock(item)}
                      className="
                        flex-1
                        py-3 rounded-2xl
                        bg-green-500
                        hover:bg-green-600
                        text-black
                        font-black
                        transition-all duration-300
                        flex items-center justify-center gap-2
                      "
                    >
                      <FaArrowUp />
                      Add
                    </button>

                    <button
                      onClick={() => deductStock(item)}
                      className="
                        flex-1
                        py-3 rounded-2xl
                        bg-red-500
                        hover:bg-red-600
                        text-black
                        font-black
                        transition-all duration-300
                        flex items-center justify-center gap-2
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

        </div>
      )}
    </div>
  );
}
