import { motion } from 'motion/react';
import { Heading } from '@/components/rc';
import WineIcon from '@/components/icons/WineIcon';

export default function SplashScreen() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--rc-surface-primary)]">
      <motion.div
        className="flex flex-col items-center gap-3"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <WineIcon size={48} />
        <Heading scale="title" colour="accent-pink" align="centre">
          RAVE CAVE
        </Heading>
      </motion.div>
    </div>
  );
}
