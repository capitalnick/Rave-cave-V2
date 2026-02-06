import React, { useState, useEffect, useRef } from 'react';
import { Wine } from '../types';
import { X, Star, Wine as WineIcon, Plus, Minus, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { getWineColors, getMaturityStatus } from '../constants';

interface WineModalProps {
  wine: Wine;
  onClose: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
}

const WineModal: React.FC<WineModalProps> = ({ wine, onClose, onUpdate }) => {
  const maturity = getMaturityStatus(wine.drinkFrom, wine.drinkUntil);
  const colors = getWineColors(wine.type);
  const displayImageUrl = wine.resolvedImageUrl;
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const [localQty, setLocalQty] = useState(Number(wine.quantity) || 0);
  const qtyTimeoutRef = useRef<number | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handlePopState = () => onCloseRef.current();
    window.history.pushState({ modalOpen: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateQuantity = (newQty: number) => {
    setLocalQty(newQty);
    if (qtyTimeoutRef.current) window.clearTimeout(qtyTimeoutRef.current);
    
    qtyTimeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) {
        await onUpdate('quantity', newQty.toString());
      }
    }, 500);
  };

  const handleUpdate = async (key: string) => {
    if (!onUpdate) return;
    setUpdating(true);
    try {
      await onUpdate(key, editValue);
      setEditingField(null);
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setUpdating(false);
    }
  };

  const formatPriceLabel = (p: string | number) => {
    const val = typeof p === 'string' ? parseFloat(p) : p;
    return !isNaN(val) && val > 0 ? `$${val.toFixed(0)}` : '';
  };

  const renderField = (label: string, key: string, value: string | number, fullWidth: boolean = false) => {
    const isEditing = editingField === label;
    const strValue = (value ?? '').toString();
    const displayValue = label === 'Bottle Price' ? formatPriceLabel(strValue) : strValue;

    return (
      <div className={`space-y-1 p-2 border-4 border-black bg-white ${fullWidth ? 'md:col-span-2' : ''}`}>
        <dt className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#FF006E]">{label}</dt>
        <dd className="font-mono text-xs text-black">
          {isEditing ? (
            <div className="flex gap-2">
              <input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)} 
                className="flex-1 border-2 border-black px-2 py-0.5 text-xs outline-none focus:border-[#CCFF00]" 
                autoFocus 
                onKeyDown={e => e.key === 'Enter' && handleUpdate(key)}
              />
              <button 
                onClick={() => handleUpdate(key)} 
                disabled={updating}
                className="bg-[#CCFF00] px-3 py-0.5 border-2 border-black font-bold uppercase text-[9px]"
              >
                {updating ? '...' : 'SAVE'}
              </button>
            </div>
          ) : (
            <span 
              onClick={() => { setEditingField(label); setEditValue(strValue); }} 
              className="cursor-pointer hover:bg-yellow-50 block min-h-[1rem]"
            >
              {displayValue || ''}
            </span>
          )}
        </dd>
      </div>
    );
  };

  const isLightColor = wine.type === 'White' || wine.type === 'Sparkling' || wine.type === 'Dessert';

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex items-center justify-center p-0 sm:p-2" onClick={onClose}>
      <div 
        className={`${colors.bg} max-w-full sm:max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto sm:border-8 border-black shadow-[15px_15px_0_rgba(0,0,0,1)]`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <div className="h-60 bg-black flex items-center justify-center border-b-8 border-black overflow-hidden">
            {displayImageUrl ? (
              <img 
                src={displayImageUrl} 
                alt={wine.name} 
                className="w-full h-full object-contain"
              />
            ) : (
              <WineIcon size={64} className="text-white opacity-20" />
            )}
          </div>
          
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 bg-black border-4 border-[#CCFF00] p-1.5 text-[#CCFF00] hover:bg-[#FF006E] transition-colors z-20"
          >
            <X size={20} />
          </button>

          <div className="p-6 pb-2 space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60">
              <MapPin size={10} /> {wine.region || ''}{wine.region && wine.country ? ', ' : ''}{wine.country || ''}
            </p>
            <h2 className="font-display text-4xl lg:text-5xl leading-none uppercase tracking-tighter text-black">
              {wine.producer}
            </h2>
            <div className="flex flex-col">
              <p className={`font-display text-6xl lg:text-7xl leading-none tracking-tighter ${isLightColor ? 'text-stroke-black' : ''}`} style={{color: colors.stripColor}}>
                {wine.vintage}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">
                {wine.cepage || ''}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 flex flex-wrap items-center gap-3 mb-6">
          <div className="sticker-badge flex items-center gap-2 px-3 py-1.5 bg-black border-4 border-black text-[#CCFF00]">
            <Star size={16} fill="currentColor" />
            {editingField === 'Rating' ? (
               <input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)} 
                className="w-10 bg-transparent border-b border-[#CCFF00] font-display text-xl outline-none" 
                autoFocus 
                onBlur={() => handleUpdate('vivinoRating')}
                onKeyDown={e => e.key === 'Enter' && handleUpdate('vivinoRating')}
              />
            ) : (
              <span 
                className="font-display text-2xl cursor-pointer" 
                onClick={() => { setEditingField('Rating'); setEditValue(wine.vivinoRating?.toString() || ''); }}
              >
                {Number(wine.vivinoRating || 0).toFixed(1)}
              </span>
            )}
          </div>

          <div className={`sticker-badge flex items-center gap-2 px-3 py-1.5 border-4 border-black font-display text-xl ${maturity.includes('Drink Now') ? 'bg-[#CCFF00] text-black' : 'bg-white'}`}>
            {maturity.includes('Drink Now') ? <WineIcon size={16} /> : maturity.includes('Hold') ? <Clock size={16} /> : <AlertTriangle size={16} />}
            <span>{maturity.replace(/[🍷🟢⚠️]/g, '').trim().toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto px-3 py-1.5 border-4 border-black bg-white">
            <button 
              onClick={() => updateQuantity(Math.max(0, localQty - 1))}
              className="p-1 hover:bg-gray-100 transition-colors"
            >
              <Minus size={16} />
            </button>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[7px] uppercase font-bold text-gray-400">Qty</span>
              <span className="font-display text-2xl leading-none w-6 text-center">{localQty}</span>
            </div>
            <button 
              onClick={() => updateQuantity(localQty + 1)}
              className="p-1 hover:bg-gray-100 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 pt-0 pb-8">
          <div className="grid md:grid-cols-2 gap-3 border-t-4 border-black pt-6">
            {renderField('Tasting Notes', 'tastingNotes', wine.tastingNotes, true)}
            {renderField('Wine name', 'name', wine.name)}
            {renderField('Bottle Price', 'price', wine.price)}
            {renderField('Drink From', 'drinkFrom', wine.drinkFrom)}
            {renderField('Drink Until', 'drinkUntil', wine.drinkUntil)}
            {renderField('Country', 'country', wine.country)}
            {renderField('Region', 'region', wine.region)}
            {renderField('Producer', 'producer', wine.producer)}
            {renderField('Appellation', 'appellation', wine.appellation || '')}
            {renderField('Cépage', 'cepage', wine.cepage, true)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WineModal;