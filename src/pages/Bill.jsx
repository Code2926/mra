import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import {
  FaShoppingCart,
  FaUser,
  FaBox,
  FaTrash,
  FaPrint,
  FaSearch,
  FaExclamationTriangle,
  FaFileInvoice,
  FaFilter,
} from "react-icons/fa";

export default function Bill() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  /* SEARCH + FILTERS */
  const [search, setSearch] = useState("");
  const [bikeFilter, setBikeFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("product_name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load products");
    } else {
      setProducts(data || []);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (!error) {
      setSettings(data);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const formatNumber = (num) => {
    const value = Number(num) || 0;

    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value;
  };

  const bikeTypes = [...new Set(products.map((p) => p.bike_type).filter(Boolean))];
  const qualities = [...new Set(products.map((p) => p.quality).filter(Boolean))];
  const models = [...new Set(products.map((p) => p.model).filter(Boolean))];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = `${p.product_name} ${p.bike_type} ${p.quality} ${p.model || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesBike = bikeFilter ? p.bike_type === bikeFilter : true;
      const matchesQuality = qualityFilter ? p.quality === qualityFilter : true;
      const matchesModel = modelFilter ? p.model === modelFilter : true;

      return matchesSearch && matchesBike && matchesQuality && matchesModel;
    });
  }, [products, search, bikeFilter, qualityFilter, modelFilter]);

  const addToCart = (product) => {
    const exists = cart.find((item) => item.id === product.id);

    if (exists) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1, price: "" }]);
    }

    toast.success(`${product.product_name} added`);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0 || isNaN(qty)) return;

    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, quantity: qty } : item
      )
    );
  };

  const updatePrice = (id, price) => {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, price } : item
      )
    );
  };

  const removeItem = (id) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.success("Item removed");
  };

  const total = cart.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + item.quantity * price;
  }, 0);

  const validate = () => {
    if (!clientName.trim()) {
      toast.error("Enter client name");
      return false;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return false;
    }

    for (let item of cart) {
      if (item.quantity > item.stock) {
        toast.error(`Not enough stock for ${item.product_name}`);
        return false;
      }

      if (!item.price || parseFloat(item.price) <= 0) {
        toast.error(`Enter price for ${item.product_name}`);
        return false;
      }
    }

    return true;
  };

  const hasStockIssue = cart.some((item) => item.quantity > item.stock);

  const saveBill = async () => {
    if (!validate()) return;

    setLoading(true);

    const prefix = settings?.invoice_prefix || "BILL";
    const generatedBill = `${prefix}-${Date.now()}`;

    try {
      const { data: billData, error } = await supabase
        .from("bills")
        .insert([
          {
            bill_number: generatedBill,
            client_name: clientName,
            total_amount: total,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const items = cart.map((item) => ({
        bill_id: billData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(items);

      if (itemsError) throw itemsError;

      for (let item of cart) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: item.stock - item.quantity })
          .eq("id", item.id);

        if (stockError) throw stockError;
      }

      toast.success("Bill saved successfully");
      window.open(`/invoice/${billData.id}`, "_blank");

      setCart([]);
      setClientName("");
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen space-y-8 text-black dark:text-white bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-[#0a0a0a] dark:to-black p-4 md:p-8">
      
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Billing
        </h1>
        <p className="text-gray-500 dark:text-white/50">
          Create invoices and manage customer billing
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg"
        >
          <p className="text-sm text-gray-500 dark:text-white/50">Products</p>
          <h2 className="text-4xl font-black mt-2">{formatNumber(products.length)}</h2>
          <div className="mt-4 text-blue-500 text-xl">
            <FaBox />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg"
        >
          <p className="text-sm text-gray-500 dark:text-white/50">Cart Items</p>
          <h2 className="text-4xl font-black mt-2">{formatNumber(cart.length)}</h2>
          <div className="mt-4 text-green-500 text-xl">
            <FaShoppingCart />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg"
        >
          <p className="text-sm text-gray-500 dark:text-white/50">Total Amount</p>
          <h2 className="text-4xl font-black mt-2">Rs {formatNumber(total)}</h2>
          <div className="mt-4 text-yellow-500 text-xl">
            <FaFileInvoice />
          </div>
        </motion.div>

      </div>

      {/* FILTER SECTION */}
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl p-6 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FaFilter />
            </div>
            <div>
              <h3 className="text-xl font-black">Search & Filters</h3>
              <p className="text-xs text-gray-500 dark:text-white/40">
                Refine product selection
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
            className="px-4 py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
            <FaSearch className="text-blue-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent outline-none"
            />
          </div>

          <select
            value={bikeFilter}
            onChange={(e) => setBikeFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10"
          >
            <option value="">All Bike Types</option>
            {bikeTypes.map((t, i) => (
              <option key={i}>{t}</option>
            ))}
          </select>

          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10"
          >
            <option value="">All Qualities</option>
            {qualities.map((q, i) => (
              <option key={i}>{q}</option>
            ))}
          </select>

          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10"
          >
            <option value="">All Models</option>
            {models.map((m, i) => (
              <option key={i}>{m}</option>
            ))}
          </select>

        </div>
      </motion.div>

      {/* PRODUCTS */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex justify-between mb-5">
          <h2 className="text-2xl font-black">Products</h2>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
            {filteredProducts.length} Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProducts.map((p) => {
            const lowStock = p.stock <= 5;

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -5, scale: 1.01 }}
                onClick={() => addToCart(p)}
                className={`cursor-pointer rounded-3xl p-6 border transition-all duration-300 ${
                  lowStock
                    ? "border-red-500/30 bg-red-500/[0.05]"
                    : "border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03]"
                }`}
              >
                <h3 className="font-black text-xl">{p.product_name}</h3>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
                    {p.bike_type}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500">
                    {p.quality}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500">
                    {p.model || "NEW"}
                  </span>
                </div>

                <div className="mt-5 flex justify-between">
                  <span className="text-sm text-gray-500">Stock</span>
                  <span className={`font-black ${lowStock ? "text-red-500" : "text-green-500"}`}>
                    {formatNumber(p.stock)}
                  </span>
                </div>

                {lowStock && (
                  <div className="mt-3 text-red-500 text-sm flex items-center gap-2">
                    <FaExclamationTriangle />
                    Low stock
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* BILL SECTION */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-xl p-6 shadow-xl">

        <div className="flex justify-between mb-5">
          <h2 className="text-2xl font-black">Create Bill</h2>
          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
            {cart.length} Items
          </span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl border border-black/10 dark:border-white/10 mb-5">
          <FaUser className="text-gray-400" />
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client Name"
            className="w-full bg-transparent outline-none"
          />
        </div>

        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center p-10 border border-dashed rounded-3xl">
              <FaShoppingCart className="mx-auto text-4xl text-gray-400" />
              <p className="mt-3 font-bold">Cart is empty</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {cart.map((item) => {
                const isOut = item.quantity > item.stock;

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -3 }}
                    className="rounded-3xl p-5 border bg-white/40 dark:bg-white/[0.03] border-black/10 dark:border-white/10"
                  >
                    <div className="flex justify-between">
                      <h3 className="font-black">{item.product_name}</h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {isOut && (
                      <p className="text-red-500 text-xs mt-1">
                        Not enough stock
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQty(item.id, parseInt(e.target.value))
                        }
                        className="p-2 rounded-xl border bg-transparent"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updatePrice(item.id, e.target.value)
                        }
                        className="p-2 rounded-xl border bg-transparent"
                      />
                    </div>

                    <div className="mt-3 flex justify-between">
                      <span className="text-sm text-gray-500">Subtotal</span>
                      <span className="font-black">
                        Rs {formatNumber(item.quantity * (parseFloat(item.price) || 0))}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 p-5 rounded-3xl border bg-white/50 dark:bg-white/[0.03] flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <h2 className="text-3xl font-black">Rs {formatNumber(total)}</h2>
          </div>

          <div className="text-green-500 text-xl">
            <FaPrint />
          </div>
        </div>

        <button
          onClick={saveBill}
          disabled={loading || hasStockIssue}
          className={`mt-5 w-full py-4 rounded-2xl font-black transition ${
            hasStockIssue
              ? "bg-red-500 text-white"
              : "bg-green-500 hover:bg-green-600 text-black"
          }`}
        >
          {loading ? "Saving..." : "Save & Print Invoice"}
        </button>
      </div>

    </div>
  );
}
