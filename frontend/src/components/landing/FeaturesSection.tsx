import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const cards = cardRefs.current.filter(Boolean);

    // Initial setup
    gsap.set(cards, {
      opacity: 0,
      y: 100,
      scale: 0.8
    });

    // Main entrance animation
    const entranceTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 70%",
      onEnter: () => {
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "back.out(1.7)",
          stagger: 0.2
        });
      }
    });

    // Parallax effect on scroll
    const parallaxTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        
        cards.forEach((card, index) => {
          if (card) {
            const speed = (index + 1) * 0.5;
            const y = progress * 50 * speed;
            const rotation = progress * (index % 2 === 0 ? 2 : -2);
            
            gsap.set(card, {
              y: y,
              rotation: rotation
            });
          }
        });
      }
    });

    // Store our triggers
    triggersRef.current = [entranceTrigger, parallaxTrigger];

    return () => {
      // Only clean up this component's triggers
      triggersRef.current.forEach(trigger => trigger.kill());
      triggersRef.current = [];
    };
  }, []);

  // Mouse movement effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      setMousePosition({ x, y });

      // Apply mouse parallax to cards
      cardRefs.current.forEach((card, index) => {
        if (card) {
          const intensity = (index + 1) * 2;
          const rotateX = (y - 0.5) * intensity;
          const rotateY = (x - 0.5) * intensity;
          const translateX = (x - 0.5) * intensity;
          const translateY = (y - 0.5) * intensity;

          gsap.to(card, {
            rotationX: -rotateX,
            rotationY: rotateY,
            x: translateX,
            y: translateY,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });
    };

    const handleMouseLeave = () => {
      // Reset card positions
      cardRefs.current.forEach(card => {
        if (card) {
          gsap.to(card, {
            rotationX: 0,
            rotationY: 0,
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "power2.out"
          });
        }
      });
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener('mousemove', handleMouseMove);
      section.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        section.removeEventListener('mousemove', handleMouseMove);
        section.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Chat",
      description: "Ask questions about your documents and get intelligent, contextual answers powered by advanced AI.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: "🔊",
      title: "Smart Text-to-Speech",
      description: "Listen to your documents with natural-sounding AI voices and customizable playback controls.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: "📱",
      title: "Responsive Design",
      description: "Access your documents seamlessly across all devices with our modern, mobile-first interface.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Experience instant document processing and real-time responses with our optimized infrastructure.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "Your documents are protected with enterprise-grade security and privacy-first design principles.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: "🎯",
      title: "Precise Citations",
      description: "Every AI response includes exact page references, making fact-checking and research effortless.",
      gradient: "from-teal-500 to-blue-500"
    }
  ];

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 dark:bg-blue-800 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-200 dark:bg-purple-800 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Mouse cursor effect */}
      <div 
        className="absolute w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-sm opacity-50 pointer-events-none transition-all duration-300 ease-out"
        style={{
          left: `${mousePosition.x * 100}%`,
          top: `${mousePosition.y * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight">
            Powerful Features
            <br />
            <span className="text-4xl md:text-6xl">Built for You</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Discover the tools that make document interaction seamless, intelligent, and enjoyable
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => { cardRefs.current[index] = el; }}
              className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 transform perspective-1000"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Card glow effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-3xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
              
              {/* Card content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl text-3xl mb-6 transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div className="absolute bottom-4 right-4 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 border border-blue-200 dark:border-blue-700 px-8 py-4 rounded-full">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Ready to experience the future of reading?</span>
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 
