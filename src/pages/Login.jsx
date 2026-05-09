import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { motion } from "framer-motion";

import {
  FiMail,
  FiLock,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";

const Login = () => {
  const [email, setEmail] = useState("admin@mra.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return toast.error("Please fill all fields");
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login successful");
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div
      className="
        min-h-screen
        relative
        overflow-hidden
        bg-white dark:bg-[#050505]
        flex items-center justify-center
        px-4
        transition-colors duration-300
      "
    >

      {/* BACKGROUND GLOW */}
      <div className="absolute top-[-150px] left-[-150px] h-[400px] w-[400px] rounded-full bg-green-500/20 blur-3xl" />

      <div className="absolute bottom-[-150px] right-[-150px] h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, gray 1px, transparent 1px), linear-gradient(to bottom, gray 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* LOGIN CARD */}
      <motion.form
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleLogin}
        className="
          relative z-10
          w-full max-w-md
          rounded-[32px]
          border border-gray-200 dark:border-white/10
          bg-white/80 dark:bg-white/5
          backdrop-blur-2xl
          shadow-2xl
          p-6 sm:p-8
        "
      >

        {/* TOP BADGE */}
        <div className="flex justify-center mb-5">

          <div
            className="
              h-16 w-16
              rounded-2xl
              bg-gradient-to-br from-green-500 to-emerald-600
              flex items-center justify-center
              shadow-lg
            "
          >
            <FiShield className="text-white text-3xl" />
          </div>

        </div>

        {/* HEADER */}
        <div className="text-center">

          <h1
            className="
              text-3xl sm:text-4xl
              font-black
              text-black dark:text-white
              tracking-tight
            "
          >
            MRA INVENTORY
          </h1>

          <p className="text-gray-500 dark:text-white/50 mt-3 text-sm">
            Secure inventory & billing management system
          </p>

        </div>

        {/* FORM */}
        <div className="mt-8 space-y-4">

          {/* EMAIL */}
          <div className="relative">

            <FiMail
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-gray-500
                text-lg
              "
            />

            <input
              type="email"
              placeholder="Enter your email"
              className="
                w-full h-14 pl-12 pr-4
                rounded-2xl
                bg-gray-100 dark:bg-black/30
                border border-gray-200 dark:border-white/10
                text-black dark:text-white
                placeholder:text-gray-500
                outline-none
                focus:border-green-500
                transition-all duration-300
              "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

          </div>

          {/* PASSWORD */}
          <div className="relative">

            <FiLock
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-gray-500
                text-lg
              "
            />

            <input
              type="password"
              placeholder="Enter your password"
              className="
                w-full h-14 pl-12 pr-4
                rounded-2xl
                bg-gray-100 dark:bg-black/30
                border border-gray-200 dark:border-white/10
                text-black dark:text-white
                placeholder:text-gray-500
                outline-none
                focus:border-green-500
                transition-all duration-300
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          </div>

        </div>

        {/* LOGIN BUTTON */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          disabled={loading}
          className={`
            mt-6 w-full h-14
            rounded-2xl
            font-bold
            flex items-center justify-center gap-2
            transition-all duration-300
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : `
                  bg-gradient-to-r from-green-500 to-emerald-600
                  hover:from-green-600 hover:to-emerald-700
                  text-white
                  shadow-lg shadow-green-500/20
                `
            }
          `}
        >

          {loading ? (
            "Signing in..."
          ) : (
            <>
              Login
              <FiArrowRight />
            </>
          )}

        </motion.button>

        {/* FOOTER */}
        <div className="mt-6 space-y-2 text-center">

          <p className="text-xs text-gray-500 dark:text-white/40">
            Authorized access only
          </p>

          <div
            className="
              inline-flex items-center gap-2
              px-3 py-1.5
              rounded-full
              bg-green-500/10
              text-green-600 dark:text-green-400
              text-xs font-semibold
            "
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            System Secure
          </div>

        </div>

      </motion.form>

    </div>
  );
};

export default Login;
