import { Link, useLocation } from "react-router-dom";
import { FaChartPie, FaClipboardList, FaFileInvoice, FaChartBar } from "react-icons/fa";
import { motion } from "framer-motion";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: <FaChartPie /> },
    { path: "/inventory", icon: <FaClipboardList /> },
    { path: "/bill", icon: <FaFileInvoice /> },
    { path: "/reports", icon: <FaChartBar /> },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 lg:hidden flex justify-center">

      {/* FLOATING DOCK */}
      <div className="
        relative
        flex items-center justify-around
        w-[85%] max-w-sm
        px-2 py-3
        rounded-3xl

        bg-white/70 dark:bg-[#0a0a0a]/70
        backdrop-blur-2xl

        border border-black/10 dark:border-white/10
        shadow-[0_10px_40px_rgba(0,0,0,0.15)]
      ">

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative flex items-center justify-center"
              >

                {/* ACTIVE BACKGROUND */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="
                      absolute
                      w-11 h-11
                      rounded-2xl
                      bg-black/10 dark:bg-white/10
                      border border-black/10 dark:border-white/10
                      shadow-md
                    "
                  />
                )}

                {/* ICON ONLY */}
                <div
                  className={`
                    relative z-10 text-xl transition-all duration-300
                    ${isActive
                      ? "text-black dark:text-white scale-110"
                      : "text-black/40 dark:text-white/40"}
                  `}
                >
                  {item.icon}
                </div>

                {/* ACTIVE DOT */}
                {isActive && (
                  <motion.div
                    layoutId="active-dot"
                    className="absolute -bottom-2 h-1 w-1 rounded-full bg-black dark:bg-white"
                  />
                )}

              </motion.div>
            </Link>
          );
        })}

      </div>
    </div>
  );
}
