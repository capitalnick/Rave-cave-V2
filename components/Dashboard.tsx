import React from 'react';
import { Wine } from '../types';
import { inventoryService } from '../services/inventoryService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { WINE_COLORS } from '../constants';

const Dashboard: React.FC<{ inventory: Wine[] }> = ({ inventory }) => {
  const stats = inventoryService.getStats(inventory);
  const pieData = Object.entries(stats.typeDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-10 h-full overflow-y-auto space-y-10">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="font-display text-8xl leading-none uppercase tracking-tighter">Status</h2>
          <p className="font-mono text-sm uppercase tracking-widest text-[#878787]">Cellar Integrity: Optimized</p>
        </div>
        <div className="border-8 border-[#0A0A0A] bg-[#CCFF00] p-6 shadow-[10px_10px_0_rgba(0,0,0,1)]">
          <p className="font-mono text-[12px] uppercase font-bold text-black mb-1">Estimated Value</p>
          <p className="font-display text-6xl leading-none">${stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border-4 border-black bg-white p-8">
          <h3 className="font-display text-4xl mb-6 border-b-4 border-[#CCFF00] pb-2">STOCK</h3>
          <p className="font-display text-9xl leading-none">{stats.totalBottles}</p>
          <p className="font-mono text-xs mt-2 text-[#878787]">BOTTLES REGISTERED</p>
        </div>

        <div className="border-4 border-black bg-white p-8 col-span-2">
          <h3 className="font-display text-4xl mb-6 border-b-4 border-[#FF006E] pb-2">VARIETAL BALANCE</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={WINE_COLORS[entry.name] || '#0A0A0A'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0A0A0A', color: '#fff', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border-4 border-black bg-white p-8">
         <h3 className="font-display text-4xl mb-8 border-b-4 border-[#CCFF00] pb-2 uppercase">Core Producers</h3>
         <div className="h-80">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={stats.topProducers}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="#878787" />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#F5F0E8' }} contentStyle={{ background: '#0A0A0A', color: '#fff', border: 'none' }} />
                <Bar dataKey="count" fill="#FF006E" />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;