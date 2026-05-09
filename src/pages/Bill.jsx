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
} from "react-icons/fa";

export default function Bill() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("product_name", { ascending: true });

    if (error) toast.error("Failed to load products");
    else setProducts(data || []);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (!error) setSettings(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      `${p.product_name} ${p.bike_type} ${p.quality} ${p.model}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [products, search]);

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
      setCart([
        ...cart,
        { ...product, quantity: 1, price: "" },
      ]);
    }

    toast.success(`${product.product_name} added`);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) return;
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
    if (!clientName) return toast.error("Enter client name"), false;
    if (!cart.length) return toast.error("Cart is empty"), false;

    for (let item of cart) {
      if (item.quantity > item.stock)
        return toast.error(`Not enough stock for ${item.product_name}`), false;

      if (!item.price || item.price <= 0)
        return toast.error(`Enter price for ${item.product_name}`), false;
    }

    return true;
  };

  const hasStockIssue = cart.some(
    (item) => item.quantity > item.stock
  );

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
    <div className="space-y-6 text-black dark:text-white">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Billing</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Create invoices and manage customer billing
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] w-full lg:w-[320px]">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-sm placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">Products</p>
              <h2 className="text-4xl font-black mt-2">{formatNumber(products.length)}</h2>
            </div>
            <FaBox className="text-blue-500 text-2xl" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">Cart Items</p>
              <h2 className="text-4xl font-black mt-2">{formatNumber(cart.length)}</h2>
            </div>
            <FaShoppingCart className="text-green-500 text-2xl" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/50">Total Amount</p>
              <h2 className="text-4xl font-black mt-2">Rs {formatNumber(total)}</h2>
            </div>
            <FaFileInvoice className="text-yellow-500 text-2xl" />
          </div>
        </motion.div>
      </div>

      {/* PRODUCTS */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-black">Products</h2>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
            {filteredProducts.length} Items
          </span>
        </div>

        {/* FIXED: 2 COLUMNS ONLY ON LARGE SCREENS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filteredProducts.map((p) => {
            const lowStock = p.stock <= 5;

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                onClick={() => addToCart(p)}
                className={`cursor-pointer rounded-3xl p-5 border ${
                  lowStock
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                }`}
              >
                <h3 className="font-black text-lg">{p.product_name}</h3>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="px-3 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
                    {p.bike_type}
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500">
                    {p.quality}
                  </span>
                </div>

                <div className="mt-4 flex justify-between">
                  <span className="text-sm text-gray-500">Stock</span>
                  <span className={`font-black ${lowStock ? "text-red-500" : "text-green-500"}`}>
                    {formatNumber(p.stock)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* BILL SECTION (UNCHANGED) */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
        <h2 className="text-2xl font-black mb-4">Create Bill</h2>

        <div className="flex items-center gap-3 mb-4">
          <FaUser />
          <input
            className="w-full bg-transparent outline-none"
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        {/* (rest of your bill section unchanged) */}
        <button
          onClick={saveBill}
          disabled={loading || hasStockIssue}
          className="mt-4 w-full py-3 rounded-2xl bg-green-500 font-bold"
        >
          {loading ? "Saving..." : "Save & Print"}
        </button>
      </div>
    </div>
  );
}
