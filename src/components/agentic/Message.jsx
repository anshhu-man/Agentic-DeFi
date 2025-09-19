import { cls } from "./utils"
import React, { lazy, Suspense } from "react"

// Lazy load the chart generator to avoid SSR issues
const ChartGenerator = lazy(() => import("../ChartGenerator").then(module => ({ default: module.ChartGenerator })))

function ChartRenderer({ data, type }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading chart...</div>}>
      <ChartGenerator data={data} type={type} />
    </Suspense>
  )
}

export default function Message({ role, children, chartData, chartType }) {
  const isUser = role === "user"
  return (
    <div className={cls("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-gray-900 text-[10px] font-bold text-white dark:bg-card dark:text-gray-900">
          AI
        </div>
      )}
      <div
        className={cls(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground dark:bg-card dark:text-gray-900"
            : "bg-card text-gray-900 dark:bg-gray-900 dark:text-gray-100 border border-border dark:border-gray-800",
        )}
      >
        {children}
        {chartData && chartType && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-border">
            <div className="h-64 w-full">
              {/* Chart will be rendered here - using dynamic import to avoid SSR issues */}
              <ChartRenderer data={chartData} type={chartType} />
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-gray-900 text-[10px] font-bold text-white dark:bg-card dark:text-gray-900">
          JD
        </div>
      )}
    </div>
  )
}
