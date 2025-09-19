"use client"

import { motion } from "framer-motion"

export default function Marquee() {
  const text = "AI-Powered DeFi Analytics"
  
  return (
    <div className="relative w-full overflow-hidden py-16">
      <div className="flex">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: "-100%" }}
          transition={{ 
            repeat: Infinity, 
            ease: "linear", 
            duration: 500,
            repeatType: "loop"
          }}
        >
          {[...Array(8)].map((_, index) => (
            <div key={index} className="flex items-center shrink-0">
              <span
                className="text-7xl sm:text-8xl md:text-9xl font-bold text-transparent px-8"
                style={{
                  WebkitTextStroke: "1px rgb(156 163 175)", // tailwind gray-400
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}