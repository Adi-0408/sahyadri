import React, { useEffect, useRef } from 'react';

interface MobileAutoScrollProps {
  children: React.ReactNode;
  autoScrollInterval?: number;
}

export const MobileAutoScroll: React.FC<MobileAutoScrollProps> = ({ 
  children, 
  autoScrollInterval = 3000 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only auto-scroll on mobile (less than 640px)
    const isMobile = window.innerWidth < 640;
    if (!isMobile) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        
        // If we've reached the end, snap back to the beginning
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll by one card width (approx 85vw + gap)
          const scrollAmount = clientWidth * 0.85 + 16; // 16px is the gap
          scrollRef.current.scrollTo({ left: scrollLeft + scrollAmount, behavior: 'smooth' });
        }
      }
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScrollInterval]);

  return (
    <div 
      ref={scrollRef}
      className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory scrollbar-hide pb-4 sm:pb-0"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {React.Children.map(children, (child) => (
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 h-full">
          {child}
        </div>
      ))}
    </div>
  );
};
