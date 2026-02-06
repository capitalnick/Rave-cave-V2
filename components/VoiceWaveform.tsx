import React from 'react';

const VoiceWaveform: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes waveform-pulse {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div className="flex items-center justify-center gap-3 w-full h-full">
        <div className="flex items-center gap-[3px] h-6">
          {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
            <div
              key={i}
              className="w-[3px] h-full rounded-sm origin-center"
              style={{
                backgroundColor: '#9d4edd',
                animation: `waveform-pulse 0.8s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">
          Listening…
        </span>
      </div>
    </>
  );
};

export default VoiceWaveform;
