"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  const isDark = theme === "dark"

  // Spring configuration for smooth animations
  const springConfig = {
    type: "spring",
    stiffness: 700,
    damping: 30,
    mass: 1
  }

  return (
    <div className="flex items-center gap-3">
      <label className="relative inline-block cursor-pointer" htmlFor="theme-toggle">
        <input
          type="checkbox"
          id="theme-toggle"
          className="sr-only"
          checked={isDark}
          onChange={handleToggle}
        />
        
        {/* Toggle background */}
        <motion.div 
          className="w-[60px] h-8 rounded-full relative overflow-hidden"
          animate={{
            backgroundColor: isDark ? "#4ade80" : "#d1d5db"
          }}
          transition={springConfig}
        >
          {/* Slider thumb with spring animation */}
          <motion.div 
            className="absolute top-1 w-6 h-6 bg-white rounded-full z-20"
            animate={{
              x: isDark ? 28 : 4,
              scale: isDark ? 1.1 : 1
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
              mass: 1.2
            }}
            style={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
            whileHover={{ scale: isDark ? 1.15 : 1.05 }}
            whileTap={{ scale: isDark ? 1.05 : 0.95 }}
          />
        </motion.div>
      </label>
      
      {/* Animated text */}
      <AnimatePresence mode="wait">
        <motion.span 
          key={isDark ? 'dark' : 'light'}
          className="text-sm text-gray-600 dark:text-gray-300 font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        >
          {isDark ? "Dark Mode" : "Light Mode"}
        </motion.span>
      </AnimatePresence>
    </div>
  )
} 