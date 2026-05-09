import { Link, useLocation } from "react-router-dom";
import { FaChartPie, FaClipboardList, FaFileInvoice, FaChartBar } from "react-icons/fa";
import { motion } from "framer-motion";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: <FaChartPie /> },
    { name: "Inventory", path: "/inventory", icon: <FaClipboardList /> },
    { name: "Bill", path: "/bill", icon: <FaFileInvoice /> },
    { name: "Reports", path: "/reports", icon: <FaChartBar /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">

      {/* BACKDROP */}
      <div className="
        absolute inset-0
        bg-white/80 dark:bg-[#050505]/80
        backdrop-blur-2xl
        border-t border-black/10 dark:border-white/10
      " />

      {/* NAV */}
      <div className="relative flex items-center justify-around px-2 py-2">

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.name} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="relative flex flex-col items-center justify-center py-2"
              >

                {/* ACTIVE PILL */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="
                      absolute inset-x-3 top-0 bottom-0
                      rounded-2xl
                      bg-black/5 dark:bg-white/10
                      border border-black/10 dark:border-white/10
                      shadow-sm dark:shadow-none
                    "
                  />
                )}

                {/* ICON ONLY */}
                <div
                  className={`
                    relative z-10 text-2xl transition-all duration-300
                    ${isActive
                      ? "text-black dark:text-white scale-110"
                      : "text-black/50 dark:text-white/50"}
                  `}
                >
                  {item.icon}
                </div>

                {/* ACTIVE DOT */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="relative z-10 mt-1 h-1.5 w-1.5 rounded-full bg-black dark:bg-white"
                  />
                )}

              </motion.div>
            </Link>
          );
        })}

      </div>

      {/* SAFE AREA */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-[#050505]/80" />
    </div>
  );
}
