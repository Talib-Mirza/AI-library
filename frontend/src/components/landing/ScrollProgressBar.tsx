import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ScrollProgressBar = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    if (!progressBarRef.current || !progressFillRef.current) return;

    const progressBar = progressBarRef.current;
    const progressFill = progressFillRef.current;

    // Create scroll progress animation
    const progressTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        
        gsap.set(progressFill, {
          scaleX: progress,
          transformOrigin: "left center"
        });

        // Change color based on progress
        const hue = progress * 270; // From blue (240) to purple (270) to pink (300)
        progressFill.style.background = `linear-gradient(90deg, 
          hsl(${240 + hue * 0.2}, 70%, 60%), 
          hsl(${270 + hue * 0.3}, 80%, 65%))`;
      }
    });

    // Show/hide progress bar based on scroll
    const visibilityTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top -50",
      end: "bottom bottom",
      onEnter: () => {
        gsap.to(progressBar, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      },
      onLeave: () => {
        gsap.to(progressBar, {
          opacity: 0,
          y: -10,
          duration: 0.3,
          ease: "power2.out"
        });
      },
      onEnterBack: () => {
        gsap.to(progressBar, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      },
      onLeaveBack: () => {
        gsap.to(progressBar, {
          opacity: 0,
          y: -10,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    // Store our triggers
    triggersRef.current = [progressTrigger, visibilityTrigger];

    return () => {
      // Only clean up this component's triggers
      triggersRef.current.forEach(trigger => trigger.kill());
      triggersRef.current = [];
    };
  }, []);

  return (
    <div 
      ref={progressBarRef}
      className="fixed top-0 left-0 w-full h-1 bg-black/10 dark:bg-white/10 z-50 opacity-0 transform -translate-y-2"
    >
      <div 
        ref={progressFillRef}
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 origin-left scale-x-0"
      />
    </div>
  );
};

export default ScrollProgressBar; 
