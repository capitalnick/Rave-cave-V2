import React, { useState, useRef, useEffect } from 'react';
import { Wine } from '../types';
import { Wine as WineIcon, Plus, Minus, Star, Clock, AlertTriangle } from 'lucide-react';
import { getWineColors, getMaturityStatus } from '../constants';

interface WineCardProps {
  wine: Wine;
  isHero?: boolean;
  onClick: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
}

const getPriceSymbol = (price: number) => {
  if (price <= 20) return '$';
  if (price <= 40) return '$$';
  if (price <= 60) return '$$$';
  if (price <= 150) return '$$$$';
  return '$$$$$';
};

const WineCard: React.FC<WineCardProps> = ({ wine, isHero, onClick, onUpdate }) => {
  const maturity = getMaturityStatus(wine.drinkFrom, wine.drinkUntil);
  const colors = getWineColors(wine.type);
  const displayImageUrl = wine.resolvedImageUrl;
  const stampRotation = React.useMemo(() => Math.random() * 6 - 3, []);

  const [localQty, setLocalQty] = useState(Number(wine.quantity) || 0);
  const qtyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalQty(Number(wine.quantity) || 0);
  }, [wine.quantity]);

  const updateQuantity = (newQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalQty(newQty);
    if (qtyTimeoutRef.current) window.clearTimeout(qtyTimeoutRef.current);
    
    qtyTimeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) {
        await onUpdate('quantity', newQty.toString());
      }
    }, 500);
  };

  const numericPrice = typeof wine.price === 'number' ? wine.price : parseFloat(wine.price as unknown as string) || 0;
  const isLightColor = wine.type === 'White' || wine.type === 'Sparkling' || wine.type === 'Dessert';

  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer card-hover border-0 ${isHero ? colors.glow : ''} overflow-hidden flex flex-col relative bg-white h-full`}
    >
      <div className="h-[4px] sm:h-[8px]" style={{backgroundColor: colors.stripColor}}></div>
      
      {isHero && (
        <div className="absolute top-1 sm:top-3 right-1 sm:right-3 z-10 bg-black text-white px-2 sm:px-4 py-1 sm:py-2 text-[8px] sm:text-xs font-mono font-bold uppercase border-2 border-black"
             style={{ transform: `rotate(${stampRotation}deg)`, boxShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}>
          {isHero && "FAVE"}
        </div>
      )}

      <div className="aspect-square bg-[#EBEBDF] relative overflow-hidden flex items-center justify-center border-b-2 sm:border-b-4 border-black">
        {displayImageUrl ? (
          <img 
            src={displayImageUrl} 
            alt={wine.name} 
            className="w-full h-full object-cover contrast-110" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
             <WineIcon size={64} className="text-black opacity-10" />
          </div>
        )}
      </div>

      <div className={`${colors.bg} p-3 sm:p-6 flex flex-col flex-1 space-y-2 sm:space-y-4`}>
        <div className="space-y-0.5 sm:space-y-1">
          <p className="font-mono text-[7px] sm:text-[10px] uppercase tracking-widest text-[#878787] font-bold truncate">
            {wine.name || ''}
          </p>
          <p className="font-mono text-[7px] sm:text-[10px] uppercase tracking-widest text-[#878787] font-bold truncate">
            {wine.producer}
          </p>
          <h3 className="font-display text-xl sm:text-4xl leading-none uppercase tracking-tighter truncate text-black">
            {wine.cepage}
          </h3>
          <p className={`font-display text-4xl sm:text-7xl leading-none ${isLightColor ? 'text-stroke-black' : ''}`} style={{ color: colors.stripColor }}>
            {wine.vintage}
          </p>
          <p className="font-mono text-[8px] sm:text-xs font-bold opacity-25 tracking-widest">
            {getPriceSymbol(numericPrice)}
          </p>
        </div>

        <div className="mt-auto pt-3 sm:pt-6 border-t border-[#EBEBDF] flex justify-between items-center">
          <div className={`border-2 border-black px-1.5 sm:px-2 py-0.5 sm:py-1 font-display text-xs sm:text-lg tracking-tight ${
            maturity.includes('Drink Now') ? 'bg-[#CCFF00] text-black' : maturity.includes('Hold') ? 'bg-black text-[#CCFF00]' : 'bg-[#FF006E] text-white'
          }`}>
            {maturity.replace(/[🍷🟢⚠️]/g, '').trim().toUpperCase()}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0A0A0A] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-black">
            <button 
              onClick={(e) => updateQuantity(Math.max(0, localQty - 1), e)}
              className="p-0.5 hover:text-[#CCFF00] transition-colors"
            >
              <Minus size={10} className="sm:w-[14px] sm:h-[14px]" />
            </button>
            <span className="font-display text-lg sm:text-2xl leading-none min-w-[1rem] text-center">{localQty}</span>
            <button 
              onClick={(e) => updateQuantity(localQty + 1, e)}
              className="p-0.5 hover:text-[#CCFF00] transition-colors"
            >
              <Plus size={10} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WineCard;