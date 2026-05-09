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

  /* FETCH PRODUCTS */
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("product_name", { ascending: true });

    if (error) {
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
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }

    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }

    return num;
  };

  /* FILTER PRODUCTS */
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      `${p.product_name} ${p.bike_type} ${p.quality} ${p.model}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [products, search]);

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
    if (qty <= 0) return;

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
    if (!clientName) {
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

      if (!item.price || item.price <= 0) {
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Billing</h1>

          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Create invoices and manage customer billing
          </p>
        </div>

        {/* SEARCH */}
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
        {/* PRODUCTS */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5"
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

            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl">
              <FaBox />
            </div>
          </div>
        </motion.div>

        {/* CART */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5"
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

            <div className="h-14 w-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl">
              <FaShoppingCart />
            </div>
          </div>
        </motion.div>

        {/* TOTAL */}
        <motion.div
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5"
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

            <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-xl">
              <FaFileInvoice />
            </div>
          </div>
        </motion.div>
      </div>

      {/* PRODUCTS SECTION */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-black">Products</h2>

          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
            {filteredProducts.length} Items
          </span>
        </div>

        {/* NO SCROLLBAR NOW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const lowStock = p.stock <= 5;

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                onClick={() => addToCart(p)}
                className={`cursor-pointer rounded-3xl p-5 border transition-all duration-300 ${
                  lowStock
                    ? "border-red-500/20 bg-red-500/[0.05]"
                    : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="font-black text-lg break-words">
                      {p.product_name}
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-3">
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
                    <div className="text-red-500 text-lg">
                      <FaExclamationTriangle />
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-white/50">
                    Available Stock
                  </span>

                  <span
                    className={`text-xl font-black ${
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

      {/* CREATE BILL SECTION - NOW FULL WIDTH */}
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
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        <h3 className="font-black break-words">
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
                          updateQty(
                            item.id,
                            parseInt(e.target.value)
                          )
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
                          item.quantity *
                            (parseFloat(item.price) || 0)
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
