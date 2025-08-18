import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ScrollProgressBar = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!progressBarRef.current || !progressFillRef.current) return;

    const progressBar = progressBarRef.current;
    const progressFill = progressFillRef.current;

    // Create scroll progress animation
    ScrollTrigger.create({
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
    ScrollTrigger.create({
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

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div 
      ref={progressBarRef}
      className="fixed top-0 left-0 w-full h-1 z-50 opacity-0 transform -translate-y-2"
    >
      <div className="w-full h-full bg-white/10 backdrop-blur-sm">
        <div 
          ref={progressFillRef}
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 shadow-lg"
          style={{ transformOrigin: "left center" }}
        />
      </div>
    </div>
  );
};

export default ScrollProgressBar; 
