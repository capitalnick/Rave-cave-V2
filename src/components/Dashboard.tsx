import React from 'react';
import { Wine } from '@/types';
import { inventoryService } from '@/services/inventoryService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { WINE_COLORS } from '@/constants';
import { Card, Heading, MonoLabel } from '@/components/rc';
import { Divider } from '@/components/rc';

const Dashboard: React.FC<{ inventory: Wine[] }> = ({ inventory }) => {
  const stats = inventoryService.getStats(inventory);
  const pieData = Object.entries(stats.typeDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-10 h-full overflow-y-auto space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Heading scale="hero">Status</Heading>
          <MonoLabel size="label" colour="ghost">Cellar Integrity: Optimized</MonoLabel>
        </div>
        <Card elevation="raised" padding="standard" className="bg-[var(--rc-accent-acid)] shadow-[10px_10px_0_rgba(0,0,0,1)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)]">
          <MonoLabel size="micro" weight="bold" colour="primary" className="mb-1">Estimated Value</MonoLabel>
          <Heading scale="hero" colour="primary">${stats.totalValue.toLocaleString()}</Heading>
        </Card>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-emphasis)]">
          <Heading scale="heading" className="mb-6 pb-2 border-b-4 border-[var(--rc-accent-acid)]">STOCK</Heading>
          <Heading scale="hero" className="text-[96px]!">{stats.totalBottles}</Heading>
          <MonoLabel size="micro" colour="ghost" className="mt-2">BOTTLES REGISTERED</MonoLabel>
        </Card>

        <Card elevation="flat" padding="standard" className="col-span-2 border border-[var(--rc-border-emphasis)]">
          <Heading scale="heading" className="mb-6 pb-2 border-b-4 border-[var(--rc-accent-pink)]">VARIETAL BALANCE</Heading>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={WINE_COLORS[entry.name] || 'var(--rc-ink-primary)'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--rc-ink-primary)', color: '#fff', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Producers Chart */}
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-emphasis)]">
        <Heading scale="heading" className="mb-8 pb-2 border-b-4 border-[var(--rc-accent-acid)]">CORE PRODUCERS</Heading>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topProducers}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="var(--rc-ink-ghost)" />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'var(--rc-surface-tertiary)' }} contentStyle={{ background: 'var(--rc-ink-primary)', color: '#fff', border: 'none' }} />
              <Bar dataKey="count" fill="var(--rc-accent-pink)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
