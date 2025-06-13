import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ConversationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chatDemoRef = useRef<HTMLDivElement>(null);
  const featureListRef = useRef<HTMLDivElement>(null);
  const animatedShape1Ref = useRef<HTMLDivElement>(null);
  const animatedShape2Ref = useRef<HTMLDivElement>(null);
  const animatedShape3Ref = useRef<HTMLDivElement>(null);
  const animatedShape4Ref = useRef<HTMLDivElement>(null);
  const animatedShape5Ref = useRef<HTMLDivElement>(null);
  const animatedShape6Ref = useRef<HTMLDivElement>(null);

  const setParagraphRef = (index: number) => (el: HTMLDivElement | null) => {
    paragraphRefs.current[index] = el;
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const title = titleRef.current;
    const paragraphs = paragraphRefs.current.filter(Boolean);
    const chatDemo = chatDemoRef.current;
    const featureList = featureListRef.current;

    // Scroll snap animation that runs when section stops
    ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      end: "bottom 20%",
      pin: false,
      scrub: false,
      onEnter: () => {
        // Main animation sequence when section snaps into view
        const masterTL = gsap.timeline();

        // Title animation
        masterTL.fromTo(title, 
          { scale: 0.8, opacity: 0, y: 100 },
          { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: "back.out(1.7)" }
        );

        // Staggered paragraph animations
        paragraphs.forEach((paragraph, index) => {
          masterTL.fromTo(paragraph, 
            { opacity: 0, y: 60, x: index % 2 === 0 ? -30 : 30 },
            { 
              opacity: 1, 
              y: 0, 
              x: 0, 
              duration: 0.8, 
              ease: "power2.out" 
            }, 
            `-=${index === 0 ? 0.5 : 0.6}`
          );
        });

        // Chat demo animation
        if (chatDemo) {
          masterTL.fromTo(chatDemo, 
            { opacity: 0, scale: 0.9, y: 50 },
            { opacity: 1, scale: 1, y: 0, duration: 1, ease: "power2.out" }, 
            "-=0.4"
          );
        }

        // Feature list animation
        if (featureList) {
          const features = featureList.children;
          masterTL.fromTo(Array.from(features), 
            { opacity: 0, x: -20 },
            { 
              opacity: 1, 
              x: 0, 
              duration: 0.5, 
              stagger: 0.1, 
              ease: "power2.out" 
            }, 
            "-=0.6"
          );
        }
      }
    });

    // Animated shapes with scroll-triggered scrub animations
    const shapes = [
      animatedShape1Ref.current,
      animatedShape2Ref.current,
      animatedShape3Ref.current,
      animatedShape4Ref.current,
      animatedShape5Ref.current,
      animatedShape6Ref.current
    ].filter(Boolean);

    shapes.forEach((shape, index) => {
      if (shape) {
        // Set initial position - start from left for shapes moving right, right for shapes moving left
        const isTopRow = index < 3;
        const direction = index % 2 === 0 ? 1 : -1; // 1 = left to right, -1 = right to left
        
        gsap.set(shape, {
          x: direction > 0 ? -150 : window.innerWidth + 150,
          y: 0,
          rotation: "random(-180, 180)",
          scale: 0.6,
          opacity: 0.7
        });

        // Create scroll-triggered animation for each shape with bounds checking
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
          onUpdate: (self) => {
            const progress = self.progress;
            const maxWidth = window.innerWidth - 100; // Leave 100px margin
            
            // Calculate X position with bounds
            let targetX;
            if (direction > 0) {
              // Moving left to right
              targetX = Math.min(progress * (window.innerWidth + 200) - 150, maxWidth);
            } else {
              // Moving right to left  
              targetX = Math.max(window.innerWidth + 150 - progress * (window.innerWidth + 200), 100);
            }
            
            gsap.to(shape, {
              x: targetX,
              y: Math.sin(progress * Math.PI * 2.5) * 50 + (index * 20 - 30),
              rotation: progress * 270 * direction + (index * 30),
              scale: 0.6 + progress * 0.3,
              opacity: 0.4 + Math.sin(progress * Math.PI) * 0.3,
              duration: 0.2,
              ease: "none"
            });
          }
        });

        // Additional floating animation
        gsap.to(shape, {
          y: "+=15",
          duration: "random(4, 7)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: index * 0.7
        });
      }
    });

    // Floating elements animation
    gsap.to(".floating-icon", {
      y: "random(-20, 20)",
      x: "random(-10, 10)",
      rotation: "random(-15, 15)",
      duration: "random(2, 4)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.5
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const paragraphContent = [
    {
      title: "Natural Conversations",
      content: "Experience the future of document interaction. Our advanced AI doesn't just search through your documents—it understands context, remembers previous conversations, and provides intelligent responses that feel genuinely human."
    },
    {
      title: "Contextual Understanding", 
      content: "Ask questions in plain language and receive detailed answers backed by your document's content. Whether you're researching, studying, or exploring ideas, our AI adapts to your specific needs and learning style."
    },
    {
      title: "Multi-Document Intelligence",
      content: "Connect insights across your entire library. Our AI can reference multiple documents simultaneously, creating connections and providing comprehensive answers that span your entire knowledge base."
    },
    {
      title: "Personalized Learning",
      content: "The more you interact, the better it gets. Our AI learns your preferences, writing style, and areas of interest, delivering increasingly personalized and relevant responses over time."
    }
  ];

  return (
    <section 
      ref={sectionRef} 
      className="relative min-h-screen py-20 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Animated Shapes - Above Chat Demo */}
      <div className="absolute top-20 right-0 w-full h-32 overflow-hidden pointer-events-none">
        <div 
          ref={animatedShape1Ref}
          className="absolute top-4 right-20 w-16 h-16 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-2xl transform rotate-45"
        />
        <div 
          ref={animatedShape2Ref}
          className="absolute top-8 right-40 w-12 h-12 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-full"
        />
        <div 
          ref={animatedShape3Ref}
          className="absolute top-2 right-60 w-20 h-8 bg-gradient-to-r from-green-400/30 to-emerald-500/30 rounded-full transform rotate-12"
        />
      </div>

      {/* Animated Shapes - Below Chat Demo */}
      <div className="absolute bottom-20 right-0 w-full h-32 overflow-hidden pointer-events-none">
        <div 
          ref={animatedShape4Ref}
          className="absolute bottom-4 right-16 w-14 h-14 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-lg transform -rotate-30"
        />
        <div 
          ref={animatedShape5Ref}
          className="absolute bottom-8 right-36 w-18 h-6 bg-gradient-to-r from-indigo-400/30 to-purple-500/30 rounded-full transform rotate-45"
        />
        <div 
          ref={animatedShape6Ref}
          className="absolute bottom-2 right-56 w-10 h-10 bg-gradient-to-br from-teal-400/30 to-cyan-500/30 rounded-full transform rotate-90"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-8 md:px-16 lg:px-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Text content */}
        <div className="space-y-12">
          <h2 
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Conversational
            </span>
            <br />
            Intelligence
          </h2>

          <div className="space-y-8">
            {paragraphContent.map((item, index) => (
              <div 
                key={index}
                ref={setParagraphRef(index)}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-xl font-bold mb-3 text-blue-300">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>

          {/* Feature highlights */}
          <div ref={featureListRef} className="space-y-4">
            <h3 className="text-2xl font-bold text-purple-300 mb-6">Key Features:</h3>
            {[
              "Voice & text conversations",
              "Real-time document analysis", 
              "Context-aware responses",
              "Multi-language support",
              "Export conversation history"
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Chat demo mockup */}
        <div ref={chatDemoRef} className="relative">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="ml-4 text-sm text-gray-400">AI Library Chat</span>
            </div>

            <div className="space-y-4 max-h-96 overflow-hidden">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                  <p className="text-sm text-white">What are the main themes in my uploaded research papers about AI ethics?</p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 max-w-sm">
                  <p className="text-sm text-gray-200">Based on your uploaded papers, I've identified 4 key themes in AI ethics:</p>
                  <ul className="mt-2 text-xs text-gray-300 space-y-1">
                    <li>• Algorithmic bias and fairness</li>
                    <li>• Privacy and data protection</li>
                    <li>• Transparency and explainability</li>
                    <li>• Human agency and oversight</li>
                  </ul>
                </div>
              </div>

              {/* User follow-up */}
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                  <p className="text-sm text-white">Can you elaborate on the transparency aspect?</p>
                </div>
              </div>

              {/* AI detailed response */}
              <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 max-w-sm">
                  <p className="text-sm text-gray-200">From your papers, transparency in AI refers to making algorithms interpretable and decisions explainable. Key points include...</p>
                  <div className="mt-2 text-xs text-blue-300">Source: "AI Ethics Framework.pdf" (Page 23)</div>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="mt-6 flex items-center space-x-3">
              <div className="flex-1 bg-slate-800/50 rounded-full px-4 py-2 border border-white/10">
                <p className="text-sm text-gray-400">Ask anything about your documents...</p>
              </div>
              <button className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>

          {/* Floating icons */}
          <div className="floating-icon absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>

          <div className="floating-icon absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>

          <div className="floating-icon absolute top-1/2 -right-8 w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConversationSection; 
