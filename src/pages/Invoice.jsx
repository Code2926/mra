import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

const Invoice = () => {
  const { id } = useParams();

  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────
  // FORMATTERS
  // ─────────────────────────────────────────────

  const formatCurrency = (num) => {
    return `Rs. ${Number(num || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────

  const fetchInvoice = async () => {
    try {
      setLoading(true);

      // BILL
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .select("*")
        .eq("id", id)
        .single();

      if (billError) throw billError;

      // ITEMS
      const { data: itemsData, error: itemsError } = await supabase
        .from("bill_items")
        .select("*")
        .eq("bill_id", id);

      if (itemsError) throw itemsError;

      // SETTINGS
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();

      setSettings(settingsData || null);

      // EMPTY ITEMS
      if (!itemsData || itemsData.length === 0) {
        setBill(billData);
        setItems([]);
        return;
      }

      // PRODUCTS
      const productIds = [...new Set(itemsData.map((i) => i.product_id))];

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, product_name, bike_type, quality, model")
        .in("id", productIds);

      if (productsError) throw productsError;

      // PRODUCT MAP
      const productMap = {};

      productsData?.forEach((product) => {
        productMap[product.id] = product;
      });

      // MERGE
      const mergedItems = itemsData.map((item) => {
        const product = productMap[item.product_id];

        return {
          ...item,
          product_name: product?.product_name || "Unknown Product",
          bike_type: product?.bike_type || "-",
          quality: product?.quality || "-",
          model: product?.model || "-",
        };
      });

      setBill(billData);
      setItems(mergedItems);

    } catch (err) {
      console.error("Invoice Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  // ─────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return (
        sum +
        Number(item.quantity || 0) *
        Number(item.price || 0)
      );
    }, 0);
  }, [items]);

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading Invoice...
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={loadingStyle}>
        Invoice Not Found
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <>
      {/* ACTIONS */}
      <div className="no-print" style={topBar}>
        <button
          onClick={() => window.print()}
          style={printButton}
        >
          Print Invoice
        </button>
      </div>

      {/* INVOICE */}
      <div style={page}>

        {/* HEADER */}
        <div style={header}>

          {/* LEFT */}
          <div>
            <h1 style={companyName}>
              MUSA AUTO PARTS
            </h1>

            <p style={subHeading}>
              Wholesale Motorcycle Parts Dealer
            </p>

            <p style={brandText}>
              Manufactured & Distributed By{" "}
              <strong>Musa Cable House</strong>
            </p>

            <p style={brandText}>
              Official Brands:{" "}
              <strong>MRA</strong> |{" "}
              <strong>RDR</strong>
            </p>

            <p style={brandText}>
              Owner:{" "}
              <strong>Muhammad Rizwan Sadiq</strong>
            </p>

            <p style={companyText}>
              {settings?.address ||
                "Charagh Din Street, 78 McLeod Rd, Garhi Shahu, Lahore, Pakistan"}
            </p>

            <p style={companyText}>
              Phone: {settings?.phone || "0303-9144304"}
            </p>
          </div>

          {/* RIGHT */}
          <div style={invoiceBlock}>
            <h2 style={invoiceTitle}>
              INVOICE
            </h2>

            <p style={invoiceMeta}>
              <strong>Invoice No:</strong>{" "}
              {bill.bill_number}
            </p>

            <p style={invoiceMeta}>
              <strong>Date:</strong>{" "}
              {formatDate(bill.created_at)}
            </p>

            <p style={invoiceMeta}>
              <strong>Time:</strong>{" "}
              {formatTime(bill.created_at)}
            </p>
          </div>
        </div>

        {/* CLIENT */}
        <div style={clientSection}>
          <div>
            <p style={label}>Bill To</p>

            <h3 style={clientName}>
              {bill.client_name ||
                "Walk-in Customer"}
            </h3>
          </div>
        </div>

        {/* TABLE */}
        <table style={table}>
          <thead>
            <tr>
              <th style={thCenter}>#</th>
              <th style={thLeft}>Product</th>
              <th style={thCenter}>Bike</th>
              <th style={thCenter}>Quality</th>
              <th style={thCenter}>Model</th>
              <th style={thCenter}>Qty</th>
              <th style={thRight}>Price</th>
              <th style={thRight}>Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td style={tdCenter}>
                  {index + 1}
                </td>

                <td style={tdLeft}>
                  {item.product_name}
                </td>

                <td style={tdCenter}>
                  {item.bike_type}
                </td>

                <td style={tdCenter}>
                  {item.quality}
                </td>

                <td style={tdCenter}>
                  {item.model}
                </td>

                <td style={tdCenter}>
                  {item.quantity}
                </td>

                <td style={tdRight}>
                  {formatCurrency(item.price)}
                </td>

                <td style={tdRight}>
                  {formatCurrency(
                    Number(item.quantity) *
                    Number(item.price)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div style={totalsWrapper}>
          <div style={totalsBox}>

            <div style={totalRow}>
              <span>Subtotal</span>

              <span>
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div style={grandTotalRow}>
              <span>Total</span>

              <span>
                {formatCurrency(
                  bill.total_amount
                )}
              </span>
            </div>

          </div>
        </div>

        {/* SIGNATURE */}
        <div style={signatureWrapper}>
          <div style={signatureBox}>
            Authorized Signature
          </div>
        </div>

        {/* FOOTER */}
        <div style={footer}>
          <p>
            Musa Auto Parts | Musa Cable House
          </p>

          <p>
            Official Brands: MRA & RDR
          </p>
        </div>

      </div>

      {/* PRINT STYLES */}
      <style>
        {`
          body {
            background: #f3f4f6;
            margin: 0;
            padding: 0;
          }

          @media print {
            body {
              background: white;
            }

            .no-print {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}
      </style>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial",
};

const topBar = {
  padding: "20px",
  display: "flex",
  justifyContent: "center",
};

const printButton = {
  background: "#000",
  color: "#fff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "4px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const page = {
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto 40px",
  background: "#fff",
  padding: "36px",
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif",
  color: "#111827",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingBottom: "18px",
  borderBottom: "1.5px solid #111827",
};

const companyName = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "700",
  letterSpacing: "0.5px",
};

const subHeading = {
  margin: "4px 0 10px",
  fontSize: "13px",
  color: "#374151",
  fontWeight: "500",
};

const brandText = {
  margin: "2px 0",
  fontSize: "13px",
  color: "#111827",
};

const companyText = {
  margin: "4px 0",
  color: "#4b5563",
  fontSize: "13px",
};

const invoiceBlock = {
  textAlign: "right",
};

const invoiceTitle = {
  margin: 0,
  fontSize: "34px",
  fontWeight: "700",
  letterSpacing: "1px",
};

const invoiceMeta = {
  margin: "6px 0",
  fontSize: "13px",
};

const clientSection = {
  padding: "24px 0",
};

const label = {
  fontSize: "11px",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: "6px",
  fontWeight: "700",
};

const clientName = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "700",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

const thBase = {
  background: "#f3f4f6",
  color: "#111827",
  padding: "10px",
  border: "1px solid #d1d5db",
  fontSize: "13px",
  fontWeight: "700",
};

const thCenter = {
  ...thBase,
  textAlign: "center",
};

const thLeft = {
  ...thBase,
  textAlign: "left",
};

const thRight = {
  ...thBase,
  textAlign: "right",
};

const tdBase = {
  padding: "10px",
  border: "1px solid #d1d5db",
  fontSize: "13px",
};

const tdCenter = {
  ...tdBase,
  textAlign: "center",
};

const tdLeft = {
  ...tdBase,
  textAlign: "left",
};

const tdRight = {
  ...tdBase,
  textAlign: "right",
};

const totalsWrapper = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "30px",
};

const totalsBox = {
  width: "300px",
};

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #d1d5db",
  fontSize: "14px",
};

const grandTotalRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  fontSize: "20px",
  fontWeight: "700",
};

const signatureWrapper = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "70px",
};

const signatureBox = {
  width: "220px",
  borderTop: "1px solid #111827",
  paddingTop: "8px",
  textAlign: "center",
  fontSize: "13px",
};

const footer = {
  marginTop: "50px",
  textAlign: "center",
  fontSize: "12px",
  color: "#6b7280",
};

export default Invoice;
