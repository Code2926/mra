import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const Login = () => {
  const [email, setEmail] = useState("admin@mra.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505] relative overflow-hidden transition-colors">

      {/* BACKGROUND GLOW LAYERS */}
      <div className="absolute w-[600px] h-[600px] bg-green-500/20 blur-[120px] rounded-full top-[-150px] left-[-150px]" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full bottom-[-150px] right-[-150px]" />

      {/* LOGIN CARD */}
      <motion.form
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        onSubmit={handleLogin}
        className="
          relative z-10 w-[92%] max-w-[420px]
          rounded-3xl p-8 sm:p-10
          border border-black/10 dark:border-white/10
          bg-white/70 dark:bg-white/5
          backdrop-blur-2xl
          shadow-2xl
        "
      >

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            MRA INVENTORY
          </h1>

          <p className="text-sm text-gray-500 dark:text-white/50 mt-2">
            Secure access to your system
          </p>
        </div>

        {/* EMAIL */}
        <div className="mb-4 relative">
          <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

          <input
            type="email"
            placeholder="Email address"
            className="
              w-full pl-11 pr-4 py-3 rounded-2xl
              bg-gray-100 dark:bg-black/30
              border border-black/10 dark:border-white/10
              outline-none
              focus:border-green-500
              transition
            "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="mb-6 relative">
          <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

          <input
            type={showPass ? "text" : "password"}
            placeholder="Password"
            className="
              w-full pl-11 pr-11 py-3 rounded-2xl
              bg-gray-100 dark:bg-black/30
              border border-black/10 dark:border-white/10
              outline-none
              focus:border-green-500
              transition
            "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPass ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        {/* BUTTON */}
        <button
          disabled={loading}
          className={`
            w-full py-3 rounded-2xl font-bold
            transition-all duration-300
            flex items-center justify-center gap-2
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-black"
            }
          `}
        >
          {loading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></span>
              Signing in...
            </>
          ) : (
            "Login"
          )}
        </button>

        {/* FOOTER */}
        <p className="text-xs text-center text-gray-500 dark:text-white/40 mt-6">
          © {new Date().getFullYear()} MRA System • Secure Admin Access
        </p>

      </motion.form>
    </div>
  );
};

export default Login;
