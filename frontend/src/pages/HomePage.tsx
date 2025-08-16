import { useEffect, useRef } from 'react';
import HeroSection from '../components/landing/HeroSection';
import ImageCollageSection from '../components/landing/ImageCollageSection';
import ConversationSection from '../components/landing/ConversationSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';
import ScrollProgressBar from '../components/landing/ScrollProgressBar';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    // Note: Scroll to next section functionality temporarily removed due to TypeScript issues

    // Cleanup - only clean up this component's triggers
    return () => {
      triggersRef.current.forEach(trigger => trigger.kill());
      triggersRef.current = [];
    };
  }, []);

  return (
    <div className="relative -mx-4 -mb-8">
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />
      
      {/* Landing Page Sections */}
      <main 
        className="scroll-smooth"
        style={{
          scrollSnapType: 'y mandatory'
        }}
      >
        {/* Section 1: Hero with Video Background */}
        <div style={{ scrollSnapAlign: 'start' }}>
          <HeroSection />
        </div>

        {/* Section 2: Image Collage */}
        <div style={{ scrollSnapAlign: 'start' }}>
          <ImageCollageSection />
        </div>

        {/* Section 3: Conversation Feature with Scroll Snapping */}
        <div style={{ scrollSnapAlign: 'start' }}>
          <ConversationSection />
        </div>

        {/* Section 4: Interactive Features */}
        <div style={{ scrollSnapAlign: 'start' }}>
          <FeaturesSection />
        </div>

        {/* Section 5: Call to Action */}
        <div style={{ scrollSnapAlign: 'start' }}>
          <CTASection />
        </div>
      </main>
    </div>
  );
};

export default HomePage; 
