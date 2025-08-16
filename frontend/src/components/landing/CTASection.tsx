import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CTASection = () => {
  const { isAuthenticated } = useAuth();
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const button = buttonRef.current;
    const stats = statsRef.current;

    // Initial setup
    gsap.set([title, subtitle, button, stats], {
      opacity: 0,
      y: 50,
      scale: 0.9
    });

    // Main entrance animation
    const entranceTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      onEnter: () => {
        setIsVisible(true);
        
        const tl = gsap.timeline();
        tl.to(title, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: "back.out(1.7)"
        })
        .to(subtitle, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "power2.out"
        }, "-=0.8")
        .to(button, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.7)"
        }, "-=0.6")
        .to(stats, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out"
        }, "-=0.4");
      },
      once: true
    });

    // Floating animation for the button
    if (button) {
      gsap.to(button, {
        y: -10,
        duration: 2,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1
      });
    }

    // Parallax effect
    const parallaxTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const moveY = progress * -50;
        
        if (title) gsap.set(title, { y: moveY * 0.5 });
        if (subtitle) gsap.set(subtitle, { y: moveY * 0.3 });
        if (button) gsap.set(button, { y: moveY * 0.4 });
      }
    });

    // Enhanced button hover effects
    const buttons = section.querySelectorAll('.cta-button, .secondary-button');
    
    const animateButton = (button: Element, isHover: boolean) => {
      gsap.to(button, {
        scale: isHover ? 1.05 : 1,
        rotationY: isHover ? 5 : 0,
        boxShadow: isHover ? 
          '0 20px 40px rgba(59, 130, 246, 0.4), 0 15px 25px rgba(0, 0, 0, 0.1)' : 
          '0 10px 25px rgba(59, 130, 246, 0.2), 0 5px 10px rgba(0, 0, 0, 0.1)',
        duration: 0.3,
        ease: "power2.out"
      });
    };

    buttons.forEach((button) => {
      if (button) {
        button.addEventListener('mouseenter', () => animateButton(button, true));
        button.addEventListener('mouseleave', () => animateButton(button, false));
      }
    });

    // Stats counting animation
    const countUpStats = () => {
      const statNumbers = stats?.querySelectorAll('.stat-number');
      statNumbers?.forEach((stat) => {
        const target = parseInt(stat.getAttribute('data-target') || '0');
        gsap.fromTo(stat, 
          { innerText: 0 },
          {
            innerText: target,
            duration: 2,
            ease: "power2.out",
            snap: { innerText: 1 },
            onUpdate: function() {
              stat.textContent = Math.ceil(this.targets()[0].innerText).toString();
            }
          }
        );
      });
    };

    const statsTrigger = ScrollTrigger.create({
      trigger: stats,
      start: "top 80%",
      onEnter: countUpStats,
      once: true
    });

    // Store our triggers
    triggersRef.current = [entranceTrigger, parallaxTrigger, statsTrigger];

    return () => {
      // Only clean up this component's triggers
      triggersRef.current.forEach(trigger => trigger.kill());
      triggersRef.current = [];
      
      // Clean up event listeners
      buttons.forEach(button => {
        if (button) {
          button.removeEventListener('mouseenter', () => {});
          button.removeEventListener('mouseleave', () => {});
        }
      });
    };
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-8 md:px-16 lg:px-24 max-w-6xl mx-auto">
        {/* Main headline */}
        <h2 
          ref={titleRef}
          className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 text-white leading-none"
        >
          Ready to
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Transform
          </span>
          <br />
          Your Reading?
        </h2>

        {/* Subtitle */}
        <p 
          ref={subtitleRef}
          className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
        >
          Join thousands of readers who have revolutionized their document experience with AI-powered insights and seamless interaction.
        </p>

        {/* CTA Button */}
        <div className="mb-16">
          <Link
            ref={buttonRef}
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="cta-button inline-flex items-center justify-center px-12 py-6 text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transform transition-all duration-300 shadow-2xl hover:shadow-3xl group relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative z-10 flex items-center">
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Stats section */}
        <div 
          ref={statsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="stat-number text-4xl md:text-6xl font-black text-white mb-2" data-target="10000">0</div>
            <div className="text-gray-400 text-lg font-medium">Active Users</div>
          </div>
          <div className="text-center">
            <div className="stat-number text-4xl md:text-6xl font-black text-white mb-2" data-target="50000">0</div>
            <div className="text-gray-400 text-lg font-medium">Documents Processed</div>
          </div>
          <div className="text-center">
            <div className="stat-number text-4xl md:text-6xl font-black text-white mb-2" data-target="99">0</div>
            <div className="text-gray-400 text-lg font-medium">% Satisfaction Rate</div>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="mt-16">
          <Link
            to="/pricing"
            className="secondary-button inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:border-white/60 hover:bg-white/10 transform transition-all duration-300"
          >
            View Pricing Plans
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
      
      {/* Corner decorations */}
      <div className="absolute top-10 right-10 w-20 h-20 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
      <div className="absolute bottom-10 left-10 w-16 h-16 border-2 border-white/20 rounded-lg animate-pulse"></div>
    </section>
  );
};

export default CTASection;
