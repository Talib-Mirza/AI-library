import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const title = titleRef.current;
    const cards = cardRefs.current.filter(Boolean);

    // Title animation
    ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(title, 
          { y: 100, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "back.out(1.7)" }
        );
      }
    });

    // Cards animation
    ScrollTrigger.create({
      trigger: section,
      start: "top 60%",
      onEnter: () => {
        gsap.fromTo(cards, 
          { y: 100, opacity: 0, scale: 0.8, rotation: (i) => (i % 2 === 0 ? -5 : 5) },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1, 
            rotation: 0,
            duration: 1,
            ease: "back.out(1.7)",
            stagger: 0.2
          }
        );
      }
    });

    // Parallax effect on scroll
    ScrollTrigger.create({
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

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
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
      // Reset cards to original position
      cardRefs.current.forEach((card) => {
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
    }

    return () => {
      if (section) {
        section.removeEventListener('mousemove', handleMouseMove);
        section.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const features = [
    {
      title: "AI Chat for Your Documents",
      description: "Ask questions about your uploaded PDFs and get grounded, page-aware answers with helpful references.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Intelligent Text-to-Speech",
      description: "Listen to any page with natural voices. Control speed, pitch, and voice selection for a tailored experience.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l6 3-6 3V5zM5 5v10a4 4 0 004 4h2" />
        </svg>
      ),
      color: "from-pink-500 to-red-600"
    },
    {
      title: "Modern PDF Viewer",
      description: "Fast, searchable viewer with highlighting and performance optimizations for large documents.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M7 4h10M7 8h10M7 12h10M7 16h7" />
        </svg>
      ),
      color: "from-blue-500 to-purple-600"
    }
  ];

  return (
    <section 
      ref={sectionRef} 
      className="relative min-h-[130vh] py-24 flex flex-col justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
        
        {/* Mouse-following gradient */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `${mousePosition.x * 100}%`,
            top: `${mousePosition.y * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-8 md:px-16 lg:px-24">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 text-white"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Powerful
            </span>
            <br />
            Features
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Everything you need for an enhanced reading and research experience
          </p>
        </div>

        {/* Features Grid */}
        <div 
          ref={cardsContainerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              ref={setCardRef(index)}
              className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Card gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-300`}></div>
              
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                {feature.title}
              </h3>
              
              <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                {feature.description}
              </p>

              {/* Floating elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400/30 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-purple-400/30 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ animationDelay: '0.5s' }}></div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full border border-white/20">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">Ready to enhance your reading experience?</span>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-32 right-16 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
      <div className="absolute bottom-32 left-16 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 right-32 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
    </section>
  );
};

export default FeaturesSection; 
