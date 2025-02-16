
"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SpendingPieChartProps {
  data: { name: string; value: number }[];
  totalAmount: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const SpendingPieChart: React.FC<SpendingPieChartProps> = ({ data, totalAmount }) => {
  return (
    <div className="relative w-full h-80">
      <div className="absolute top-0 left-0 w-full text-center text-xl font-semibold text-white">
        Amount Spent
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-3xl font-bold text-white">${totalAmount.toLocaleString()}</div>
      </div>
    </div>
  );
};
