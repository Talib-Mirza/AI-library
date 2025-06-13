import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ImageCollageSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const decorativeRef1 = useRef<HTMLDivElement>(null);
  const decorativeRef2 = useRef<HTMLDivElement>(null);
  const decorativeRef3 = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;
    const card3 = card3Ref.current;
    const decorative1 = decorativeRef1.current;
    const decorative2 = decorativeRef2.current;
    const decorative3 = decorativeRef3.current;
    const progressBar = progressBarRef.current;
    const status = statusRef.current;

    if (!section || !container) return;

    // Set initial states - ensure everything starts invisible/transformed
    gsap.set([title, subtitle, card1, card2, card3, status], { 
      opacity: 0, 
      y: 100,
      visibility: "hidden"
    });
    
    gsap.set(card1, { 
      x: -300, 
      rotation: -15, 
      scale: 0.7,
      transformOrigin: "center center"
    });
    
    gsap.set(card2, { 
      x: 300, 
      rotation: 15, 
      scale: 0.7,
      transformOrigin: "center center"
    });
    
    gsap.set(card3, { 
      x: -200, 
      y: 150,
      rotation: -10, 
      scale: 0.7,
      transformOrigin: "center center"
    });
    
    gsap.set([decorative1, decorative2, decorative3], { 
      scale: 0, 
      rotation: 0,
      opacity: 0
    });
    
    gsap.set(progressBar, { scaleX: 0 });

    // Create the main timeline with better timing - unpin earlier
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=200%", // Reduced further to unpin earlier and prevent shift
        pin: true,
        scrub: 0.5, // Faster scrub for smoother transitions
        anticipatePin: 1,
        onUpdate: (self) => {
          gsap.set(progressBar, { scaleX: self.progress });
        }
      }
    });

    // Phase 1: Title appears (0% - 20%)
    tl.to(title, {
      opacity: 1,
      y: 0,
      visibility: "visible",
      duration: 1.5,
      ease: "power2.out"
    })
    
    // Phase 2: Subtitle appears (20% - 30%)
    .to(subtitle, {
      opacity: 1,
      y: 0,
      visibility: "visible",
      duration: 1.2,
      ease: "power2.out"
    }, "+=0.3")
    
    // Phase 3: Decorative elements (30% - 40%)
    .to([decorative1, decorative2, decorative3], {
      scale: 1,
      opacity: 1,
      rotation: 360,
      duration: 1.2,
      ease: "back.out(1.7)",
      stagger: 0.2
    }, "+=0.2")
    
    // Phase 4: Cards animate in with better spacing (40% - 85%)
    .to(card1, {
      opacity: 1,
      visibility: "visible",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 1.8,
      ease: "power2.out"
    }, "+=0.3")
    
    .to(card2, {
      opacity: 1,
      visibility: "visible",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 1.8,
      ease: "power2.out"
    }, "+=0.2")
    
    .to(card3, {
      opacity: 1,
      visibility: "visible",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 1.8,
      ease: "power2.out"
    }, "+=0.2")
    
    // Phase 5: Status indicator appears (85% - 100%) - removed the shift animation
    .to(status, {
      opacity: 1,
      y: 0,
      visibility: "visible",
      duration: 0.8,
      ease: "power2.out"
    }, "+=0.1");

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative min-h-[120vh] bg-gray-50 dark:bg-gray-900 overflow-hidden"
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
        />
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-200/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-100/10 to-pink-100/10 dark:from-indigo-800/5 dark:to-pink-800/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main content container - positioned higher */}
      <div ref={containerRef} className="relative z-10 h-full flex flex-col justify-start items-center px-8 md:px-16 lg:px-24 pt-8">
        
        {/* Title Section - positioned at top */}
        <div className="text-center mb-8 mt-4">
          <h2 
            ref={titleRef}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight"
          >
            Seamless Reading
            <br />
            <span className="text-4xl md:text-6xl lg:text-7xl">Experience</span>
          </h2>
          <p 
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed"
          >
            Discover how our AI transforms the way you interact with your documents
          </p>
        </div>

        {/* Decorative floating elements */}
        <div 
          ref={decorativeRef1}
          className="absolute top-16 left-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-60"
        />
        <div 
          ref={decorativeRef2}
          className="absolute top-24 right-32 w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg opacity-60"
        />
        <div 
          ref={decorativeRef3}
          className="absolute bottom-20 left-40 w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full opacity-60"
        />

        {/* Cards Grid - Positioned higher with proper z-index layering */}
        <div className="relative w-full max-w-7xl mx-auto mt-2">
          
          {/* Enhanced Reading Card (card1 - bottom layer z-10) */}
          <div 
            ref={card1Ref}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 w-80 h-[450px] md:w-88 md:h-[480px] group cursor-pointer z-10"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20"></div>
              <img 
                src="/images/Enhanced-reading.png" 
                alt="Enhanced Reading" 
                className="w-full h-3/5 object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center mb-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-blue-300">Enhanced</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Enhanced Reading</h3>
                <p className="text-sm text-gray-200 leading-relaxed">Immersive reading with smart features</p>
              </div>
            </div>
          </div>

          {/* Smart Dashboard Card (card2 - middle layer z-20) */}
          <div 
            ref={card2Ref}
            className="absolute top-4 right-4 w-88 h-[380px] md:w-96 md:h-[410px] group cursor-pointer z-20"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20"></div>
              <img 
                src="/images/Smart-dashboard.png" 
                alt="Smart Dashboard" 
                className="w-full h-3/5 object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center mb-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-purple-300">Smart</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Smart Dashboard</h3>
                <p className="text-sm text-gray-200 leading-relaxed">Organize with intelligent automation</p>
              </div>
            </div>
          </div>

          {/* AI-Powered Card (card3 - top layer z-30) */}
          <div 
            ref={card3Ref}
            className="absolute top-4 left-4 w-96 h-[320px] md:w-[420px] md:h-[350px] group cursor-pointer z-30"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20"></div>
              <img 
                src="/images/AI-powered.png" 
                alt="AI-Powered Features" 
                className="w-full h-3/5 object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center mb-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">AI-Powered</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">AI-Powered</h3>
                <p className="text-sm text-gray-200 leading-relaxed">Intelligent document processing with advanced AI</p>
              </div>
            </div>
          </div>

          {/* Additional decorative elements */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500/50 rounded-full animate-ping"></div>
          <div className="absolute top-1/4 right-1/3 w-4 h-4 bg-purple-500/50 rounded-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-pink-500/50 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Status indicator */}
        <div 
          ref={statusRef}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="inline-flex items-center space-x-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Real-time AI Processing
            </span>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-10 right-10 opacity-30">
        <div className="w-20 h-20 border-2 border-blue-300 dark:border-blue-600 rounded-2xl transform rotate-12 animate-pulse"></div>
      </div>
      <div className="absolute bottom-20 left-16 opacity-20">
        <div className="w-16 h-16 border-2 border-purple-300 dark:border-purple-600 rounded-full transform -rotate-12 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
    </section>
  );
};

export default ImageCollageSection; 
