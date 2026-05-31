import { useCallback, useEffect, useRef, useState } from 'react';

export const useCarousel = () => {
  const scrollRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  
  const [isHovered, setIsHovered] = useState(false);

  const [velocity, setVelocity] = useState(0);
  const lastMouseX = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId;

    const scroll = () => {
      if (!isDragging) {
        if (Math.abs(velocity) > 0.1) {
          
          container.scrollLeft -= velocity;
          setVelocity((v) => v * 0.95); 
        } else if (!isHovered) {
          
          container.scrollLeft += 0.3;
        }

        
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft -= container.scrollWidth / 2;
        } else if (container.scrollLeft <= 0 && velocity > 0) {
          container.scrollLeft += container.scrollWidth / 2;
        }
      }

      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isDragging, isHovered, velocity]);

  const handleMouseDown = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;

    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
    setVelocity(0);

    lastMouseX.current = e.pageX;
    lastTime.current = Date.now();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setIsHovered(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const el = scrollRef.current;
      if (!isDragging || !el) return;

      e.preventDefault();

      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 2;
      el.scrollLeft = scrollLeft - walk;

      
      const now = Date.now();
      const dt = now - lastTime.current;
      const dx = e.pageX - lastMouseX.current;

      if (dt > 0) {
        setVelocity((dx / dt) * 20);
      }

      lastMouseX.current = e.pageX;
      lastTime.current = now;
    },
    [isDragging, scrollLeft, startX]
  );

  const scrollLeftBtn = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -512, behavior: 'smooth' });
  }, []);

  const scrollRightBtn = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 512, behavior: 'smooth' });
  }, []);

  return {
    scrollRef,

    
    isHovered,
    setIsHovered,

    
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,

    
    scrollLeftBtn,
    scrollRightBtn,
  };
};