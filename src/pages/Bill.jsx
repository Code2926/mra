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

  /* FETCH PRODUCTS */
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

  /* FETCH SETTINGS */
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

  /* FORMAT NUMBERS */
  const formatNumber = (num) => {
    const value = Number(num) || 0;

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }

    return value;
  };

  /* UNIQUE FILTER OPTIONS */
  const bikeTypes = [
    ...new Set(products.map((p) => p.bike_type).filter(Boolean)),
  ];

  const qualities = [
    ...new Set(products.map((p) => p.quality).filter(Boolean)),
  ];

  const models = [
    ...new Set(products.map((p) => p.model).filter(Boolean)),
  ];

  /* FILTER PRODUCTS */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = `${p.product_name} ${p.bike_type} ${p.quality} ${
        p.model || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesBike = bikeFilter
        ? p.bike_type === bikeFilter
        : true;

      const matchesQuality = qualityFilter
        ? p.quality === qualityFilter
        : true;

      const matchesModel = modelFilter
        ? p.model === modelFilter
        : true;

      return (
        matchesSearch &&
        matchesBike &&
        matchesQuality &&
        matchesModel
      );
    });
  }, [
    products,
    search,
    bikeFilter,
    qualityFilter,
    modelFilter,
  ]);

  /* ADD TO CART */
  const addToCart = (product) => {
    const exists = cart.find((item) => item.id === product.id);

    if (exists) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          price: "",
        },
      ]);
    }

    toast.success(`${product.product_name} added`);
  };

  /* UPDATE QTY */
  const updateQty = (id, qty) => {
    if (qty <= 0 || isNaN(qty)) return;

    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: qty,
            }
          : item
      )
    );
  };

  /* UPDATE PRICE */
  const updatePrice = (id, price) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              price,
            }
          : item
      )
    );
  };

  /* REMOVE ITEM */
  const removeItem = (id) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.success("Item removed");
  };

  /* TOTAL */
  const total = cart.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + item.quantity * price;
  }, 0);

  /* VALIDATION */
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

  const hasStockIssue = cart.some(
    (item) => item.quantity > item.stock
  );

  /* SAVE BILL */
  const saveBill = async () => {
    if (!validate()) return;

    setLoading(true);

    const prefix = settings?.invoice_prefix || "BILL";
    const generatedBill = `${prefix}-${Date.now()}`;

    try {
      /* CREATE BILL */
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

      /* BILL ITEMS */
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

      /* UPDATE STOCK */
      for (let item of cart) {
        const { error: stockError } = await supabase
          .from("products")
          .update({
            stock: item.stock - item.quantity,
          })
          .eq("id", item.id);

        if (stockError) throw stockError;
      }

      toast.success("Bill saved successfully");

      /* OPEN INVOICE */
      window.open(`/invoice/${billData.id}`, "_blank");

      /* RESET */
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
    <div className="space-y-6 text-black dark:text-white">
      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-black">Billing</h1>

        <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
          Create invoices and manage customer billing
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* PRODUCTS */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Products
              </p>

              <h2 className="text-4xl font-black mt-2">
                {formatNumber(products.length)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/10">
              <FaBox />
            </div>
          </div>
        </motion.div>

        {/* CART */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Cart Items
              </p>

              <h2 className="text-4xl font-black mt-2">
                {formatNumber(cart.length)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-500 flex items-center justify-center text-xl shadow-lg shadow-green-500/10">
              <FaShoppingCart />
            </div>
          </div>
        </motion.div>

        {/* TOTAL */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Total Amount
              </p>

              <h2 className="text-4xl font-black mt-2 break-words">
                Rs {formatNumber(total)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-500 flex items-center justify-center text-xl shadow-lg shadow-yellow-500/10">
              <FaFileInvoice />
            </div>
          </div>
        </motion.div>
      </div>

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

              <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                Quickly find exact products with smart filters
              </p>
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
<div className="group relative overflow-hidden rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl px-5 py-4 transition-all duration-300 hover:border-blue-500/30 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-blue-500/10 focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]">
  {/* glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

  <p className="relative text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-white/40 mb-3 font-bold">
    Bike Type
  </p>

  <div className="relative">
    <select
      value={bikeFilter}
      onChange={(e) => setBikeFilter(e.target.value)}
      className="relative appearance-none bg-transparent outline-none w-full text-sm font-semibold text-black dark:text-white pr-12 cursor-pointer tracking-wide"
    >
      <option
        value=""
        className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
      >
        All Bike Types
      </option>

      {bikeTypes.map((type, index) => (
        <option
          key={index}
          value={type}
          className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
        >
          {type}
        </option>
      ))}
    </select>

    {/* custom arrow */}
    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
      <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-500 transition-all duration-300 group-hover:scale-110 group-focus-within:scale-110 group-focus-within:bg-blue-500/20">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  </div>
</div>

          {/* QUALITY */}
<div className="group relative overflow-hidden rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl px-5 py-4 transition-all duration-300 hover:border-yellow-500/30 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-yellow-500/10 focus-within:border-yellow-500/50 focus-within:shadow-[0_0_0_4px_rgba(234,179,8,0.08)]">
  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.03] via-transparent to-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

  <p className="relative text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-white/40 mb-3 font-bold">
    Product Quality
  </p>

  <div className="relative">
    <select
      value={qualityFilter}
      onChange={(e) => setQualityFilter(e.target.value)}
      className="relative appearance-none bg-transparent outline-none w-full text-sm font-semibold text-black dark:text-white pr-12 cursor-pointer tracking-wide"
    >
      <option
        value=""
        className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
      >
        All Qualities
      </option>

      {qualities.map((quality, index) => (
        <option
          key={index}
          value={quality}
          className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
        >
          {quality}
        </option>
      ))}
    </select>

    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
      <div className="h-9 w-9 rounded-xl bg-yellow-500/10 border border-yellow-500/10 flex items-center justify-center text-yellow-500 transition-all duration-300 group-hover:scale-110 group-focus-within:scale-110 group-focus-within:bg-yellow-500/20">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  </div>
</div>

          {/* MODEL */}
<div className="group relative overflow-hidden rounded-[28px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl px-5 py-4 transition-all duration-300 hover:border-green-500/30 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-green-500/10 focus-within:border-green-500/50 focus-within:shadow-[0_0_0_4px_rgba(34,197,94,0.08)]">
  <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] via-transparent to-emerald-500/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

  <p className="relative text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-white/40 mb-3 font-bold">
    Product Model
  </p>

  <div className="relative">
    <select
      value={modelFilter}
      onChange={(e) => setModelFilter(e.target.value)}
      className="relative appearance-none bg-transparent outline-none w-full text-sm font-semibold text-black dark:text-white pr-12 cursor-pointer tracking-wide"
    >
      <option
        value=""
        className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
      >
        All Models
      </option>

      {models.map((model, index) => (
        <option
          key={index}
          value={model}
          className="bg-white dark:bg-[#0f0f0f] text-black dark:text-white"
        >
          {model}
        </option>
      ))}
    </select>

    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
      <div className="h-9 w-9 rounded-xl bg-green-500/10 border border-green-500/10 flex items-center justify-center text-green-500 transition-all duration-300 group-hover:scale-110 group-focus-within:scale-110 group-focus-within:bg-green-500/20">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  </div>
</div>
      </motion.div>

      {/* PRODUCTS SECTION */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
        <div className="flex justify-between items-center mb-5">
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
                whileHover={{ y: -4 }}
                onClick={() => addToCart(p)}
                className={`cursor-pointer rounded-3xl p-6 border transition-all duration-300 hover:shadow-xl ${
                  lowStock
                    ? "border-red-500/20 bg-red-500/[0.05]"
                    : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-2xl break-words">
                      {p.product_name}
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
                        {p.bike_type}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500">
                        {p.quality}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500">
                        {p.model || "NEW"}
                      </span>
                    </div>
                  </div>

                  {lowStock && (
                    <div className="text-red-500 text-xl flex-shrink-0">
                      <FaExclamationTriangle />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-white/50">
                    Available Stock
                  </span>

                  <span
                    className={`text-2xl font-black ${
                      lowStock ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatNumber(p.stock)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CREATE BILL SECTION */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-black">Create Bill</h2>

          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
            {cart.length} Added
          </span>
        </div>

        {/* CLIENT */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-black/20 mb-5">
          <FaUser className="text-gray-400" />

          <input
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="bg-transparent outline-none w-full placeholder:text-gray-400"
          />
        </div>

        {/* CART */}
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 p-10 text-center">
              <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-4" />

              <h3 className="font-bold text-lg">Cart is Empty</h3>

              <p className="text-sm text-gray-500 dark:text-white/50 mt-2">
                Click products to add items
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-4">
              {cart.map((item) => {
                const isOut = item.quantity > item.stock;

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -2 }}
                    className={`rounded-3xl p-5 border ${
                      isOut
                        ? "border-red-500/30 bg-red-500/[0.05]"
                        : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
                    }`}
                  >
                    {/* TOP */}
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-black break-words text-lg">
                          {item.product_name}
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                          Stock: {formatNumber(item.stock)}
                        </p>

                        {isOut && (
                          <p className="text-red-500 text-xs mt-1">
                            Not enough stock available
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="h-10 w-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:scale-105 transition-all flex-shrink-0"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {/* INPUTS */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQty(item.id, parseInt(e.target.value))
                        }
                        placeholder="Qty"
                        className="w-full rounded-2xl px-4 py-3 border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-black/20 outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) =>
                          updatePrice(item.id, e.target.value)
                        }
                        className="w-full rounded-2xl px-4 py-3 border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-black/20 outline-none"
                      />
                    </div>

                    {/* SUBTOTAL */}
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-white/50">
                        Subtotal
                      </span>

                      <span className="font-black text-lg">
                        Rs{" "}
                        {formatNumber(
                          item.quantity * (parseFloat(item.price) || 0)
                        )}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* TOTAL */}
        <div className="mt-5 rounded-3xl border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-black/20 p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Total Amount
              </p>

              <h2 className="text-4xl font-black mt-2 break-words">
                Rs {formatNumber(total)}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl">
              <FaPrint />
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={saveBill}
            disabled={loading || hasStockIssue}
            className={`mt-5 w-full py-4 rounded-2xl font-black transition-all duration-300 ${
              hasStockIssue
                ? "bg-red-500 text-white cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-black"
            }`}
          >
            {loading ? "Saving..." : "Save & Print Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
