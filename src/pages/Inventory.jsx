import React, { useEffect, useState } from "react";
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
} from "react-icons/fa";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [search, setSearch] = useState("");

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

    /* 🔥 REAL-TIME SUBSCRIPTION */
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          // Re-fetch fresh data on any change
          fetchItems();
        }
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

    if (error) {
      toast.error("Stock update failed");
    }
  };

  /* ADD STOCK */
  const addStock = async (item) => {
    const value = parseInt(inputs[item.id] || 0);

    if (!value || value <= 0) {
      return toast.error("Enter valid quantity");
    }

    await updateStock(item.id, item.stock + value);

    toast.success("Stock Added");

    setInputs({
      ...inputs,
      [item.id]: "",
    });
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

    setInputs({
      ...inputs,
      [item.id]: "",
    });
  };

  /* TOTALS */
  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.stock || 0),
    0
  );

  const lowStockItems = items.filter((item) => item.stock <= 5);

  /* SEARCH */
  const filteredItems = items.filter((item) =>
    `
      ${item.product_name}
      ${item.bike_type}
      ${item.quality}
      ${item.model}
    `
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* FORMAT */
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

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

        {/* SEARCH */}
        <div className="
          flex items-center gap-3
          px-4 py-3 rounded-2xl
          border border-black/10 dark:border-white/10
          bg-white dark:bg-[#0a0a0a]
          w-full lg:w-[320px]
        ">
          <FaSearch className="text-gray-400" />

          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-sm placeholder:text-gray-400"
          />
        </div>

      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5">
          <div className="text-sm text-gray-500">Total Products</div>
          <div className="text-4xl font-black mt-3">{items.length}</div>
          <FaBox className="text-blue-500 text-2xl mt-4" />
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5">
          <div className="text-sm text-gray-500">Total Stock</div>
          <div className="text-4xl font-black mt-3">{totalStock}</div>
          <FaWarehouse className="text-green-500 text-2xl mt-4" />
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border bg-white dark:bg-[#0a0a0a] p-5">
          <div className="text-sm text-gray-500">Low Stock</div>
          <div className="text-4xl font-black mt-3 text-red-500">
            {lowStockItems.length}
          </div>
          <FaExclamationTriangle className="text-red-500 text-2xl mt-4" />
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

                {/* INPUT */}
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
