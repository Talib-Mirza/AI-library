import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!heroRef.current || !titleRef.current || !subtitleRef.current || !buttonsRef.current) return;

    const hero = heroRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const buttons = buttonsRef.current;
    const overlay = overlayRef.current;

    // Initial animation on load
    const tl = gsap.timeline();
    
    tl.fromTo(overlay, 
      { opacity: 0.8 },
      { opacity: 0.4, duration: 2, ease: "power2.out" }
    )
    .fromTo(title, 
      { scale: 0.8, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: "back.out(1.7)" }, 
      "-=1.5"
    )
    .fromTo(subtitle, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 
      "-=0.6"
    )
    .fromTo(buttons, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 
      "-=0.4"
    );

    // Scroll-triggered animations
    // Dynamic title font size animation
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const scale = 1 + (progress * 0.3); // Grows as user scrolls
        const opacity = 1 - (progress * 0.7);
        
        gsap.set(title, {
          scale: scale,
          opacity: opacity,
          transformOrigin: "center center"
        });
        
        gsap.set(subtitle, {
          opacity: opacity
        });
        
        gsap.set(buttons, {
          opacity: opacity
        });
      }
    });

    // Parallax effect for the overlay text
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const y = progress * 100;
        const x = Math.sin(progress * Math.PI) * 20; // Slight horizontal pan
        
        gsap.set([title, subtitle, buttons], {
          y: y,
          x: x,
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/2268807-hd_1920_1080_24fps.mp4" type="video/mp4" />
      </video>
      
      {/* Video Overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-purple-900/50"
      ></div>
      
      {/* Content */}
      <div className="relative z-10 text-center text-white px-8 md:px-16 lg:px-24 w-full">
        <h1 
          ref={titleRef}
          className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 40px rgba(255,255,255,0.3)'
          }}
        >
          AI-Powered
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
            Library
          </span>
        </h1>
        
        <p 
          ref={subtitleRef}
          className="text-xl md:text-2xl lg:text-3xl mb-10 text-gray-200 max-w-4xl mx-auto leading-relaxed font-light"
        >
          Transform your reading experience with intelligent conversations, 
          seamless document management, and AI-powered insights that bring your books to life.
        </p>
        
        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
            >
              <span className="relative z-10">Go to Dashboard</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-300"></div>
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-300"></div>
              </Link>
              
              <Link
                to="/login"
                className="group relative px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:bg-white/20 hover:shadow-2xl"
              >
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-white/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full"></div>
              </Link>
            </>
          )}
        </div>
        

      </div>
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-10 w-4 h-4 bg-blue-400/30 rounded-full animate-pulse"></div>
      <div className="absolute top-1/3 right-16 w-6 h-6 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/4 left-1/4 w-3 h-3 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/3 right-1/4 w-5 h-5 bg-blue-300/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 z-20">
        <div className="flex flex-col items-center space-y-2 animate-bounce">
          <span className="text-sm font-light">Scroll to explore</span>
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 
