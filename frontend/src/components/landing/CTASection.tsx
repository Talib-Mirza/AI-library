import { useEffect, useRef } from 'react';
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
  const primaryButtonRef = useRef<HTMLAnchorElement>(null);
  const secondaryButtonRef = useRef<HTMLAnchorElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const orbitingShape1Ref = useRef<HTMLDivElement>(null);
  const orbitingShape2Ref = useRef<HTMLDivElement>(null);
  const orbitingShape3Ref = useRef<HTMLDivElement>(null);
  const backgroundShapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const primaryButton = primaryButtonRef.current;
    const secondaryButton = secondaryButtonRef.current;
    const features = featuresRef.current;
    const stats = statsRef.current;
    const orbitingShape1 = orbitingShape1Ref.current;
    const orbitingShape2 = orbitingShape2Ref.current;
    const orbitingShape3 = orbitingShape3Ref.current;
    const backgroundShape = backgroundShapeRef.current;

    // Initial setup
    gsap.set([title, subtitle, primaryButton, secondaryButton, features, stats], {
      opacity: 0,
      y: 80
    });

    gsap.set([orbitingShape1, orbitingShape2, orbitingShape3], {
      scale: 0,
      rotation: 0
    });

    gsap.set(backgroundShape, {
      scale: 0.5,
      opacity: 0
    });

    // Main animation sequence
    ScrollTrigger.create({
      trigger: section,
      start: "top 85%",
      end: "bottom 15%",
      onEnter: () => {
        const masterTL = gsap.timeline();

        // Background shape animation
        masterTL.to(backgroundShape, {
          scale: 1,
          opacity: 0.6,
          duration: 2,
          ease: "power2.out"
        })

        // Content animations
        .to(title, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "back.out(1.7)"
        }, "-=1.5")

        .to(subtitle, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out"
        }, "-=0.8")

        .to([primaryButton, secondaryButton], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "back.out(1.7)",
          stagger: 0.2
        }, "-=0.5")

        .to(features, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out"
        }, "-=0.4")

        .to(stats, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out"
        }, "-=0.6")

        // Orbiting shapes
        .to([orbitingShape1, orbitingShape2, orbitingShape3], {
          scale: 1,
          duration: 1,
          ease: "back.out(1.7)",
          stagger: 0.1
        }, "-=1");
      }
    });

    // Continuous orbiting animations
    if (orbitingShape1) {
      gsap.to(orbitingShape1, {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%"
      });
    }

    if (orbitingShape2) {
      gsap.to(orbitingShape2, {
        rotation: -360,
        duration: 25,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%"
      });
    }

    if (orbitingShape3) {
      gsap.to(orbitingShape3, {
        rotation: 360,
        duration: 30,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%"
      });
    }

    // Parallax scrolling effect
    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        
        if (backgroundShape) {
          gsap.set(backgroundShape, {
            y: progress * 100,
            rotation: progress * 45
          });
        }
        
        // Parallax for orbiting shapes
        if (orbitingShape1) {
          gsap.set(orbitingShape1, {
            y: progress * -50
          });
        }
        
        if (orbitingShape2) {
          gsap.set(orbitingShape2, {
            y: progress * 30
          });
        }
        
        if (orbitingShape3) {
          gsap.set(orbitingShape3, {
            y: progress * -20
          });
        }
      }
    });

    // Button hover animations
    const animateButton = (button: HTMLElement, isHover: boolean) => {
      gsap.to(button, {
        scale: isHover ? 1.05 : 1,
        duration: 0.3,
        ease: "power2.out"
      });
      
      const glow = button.querySelector('.glow');
      if (glow) {
        gsap.to(glow, {
          opacity: isHover ? 1 : 0.3,
          scale: isHover ? 1.2 : 1,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    const buttons = [primaryButton, secondaryButton].filter(Boolean);
    buttons.forEach(button => {
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

    ScrollTrigger.create({
      trigger: stats,
      start: "top 80%",
      onEnter: countUpStats,
      once: true
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      
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
      className="relative min-h-screen py-24 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 overflow-hidden"
    >
      {/* Animated Background Shape */}
      <div 
        ref={backgroundShapeRef}
        className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl"
      />

      {/* Orbiting Decorative Shapes */}
      <div 
        ref={orbitingShape1Ref}
        className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-3xl"
        style={{ transformOrigin: "center center" }}
      />
      <div 
        ref={orbitingShape2Ref}
        className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full"
        style={{ transformOrigin: "center center" }}
      />
      <div 
        ref={orbitingShape3Ref}
        className="absolute bottom-32 left-40 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-2xl"
        style={{ transformOrigin: "center center" }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-8 md:px-16 lg:px-24 text-center">
        
        {/* Hero Title */}
        <h2 
          ref={titleRef}
          className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            Be Among the
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            First to Experience
          </span>
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            AI-Powered Reading
          </span>
        </h2>

        {/* Subtitle */}
        <p 
          ref={subtitleRef}
          className="text-xl md:text-2xl lg:text-3xl mb-12 text-gray-300 max-w-4xl mx-auto leading-relaxed"
        >
          Join our launch community and get exclusive early access to the revolutionary AI library platform. 
          Experience the future of intelligent document interaction—completely free during our launch phase.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Link
            ref={primaryButtonRef}
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="group relative"
          >
            <div className="glow absolute -inset-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-lg opacity-30 group-hover:opacity-100 transition-all duration-300" />
            <div className="relative px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-xl font-bold rounded-full transition-all duration-300 hover:shadow-2xl">
              {isAuthenticated ? "Enter Dashboard" : "Start Free Today"}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>

          <Link
            ref={secondaryButtonRef}
            to="/use-cases"
            className="group relative"
          >
            <div className="glow absolute -inset-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full blur-lg opacity-30 group-hover:opacity-100 transition-all duration-300" />
            <div className="relative px-12 py-4 bg-transparent border-2 border-gray-300 text-gray-300 text-xl font-semibold rounded-full transition-all duration-300 hover:border-white hover:text-white hover:shadow-2xl">
              See Use Cases
            </div>
          </Link>
        </div>

        {/* Launch Features */}
        <div 
          ref={featuresRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Launch Day Special</h3>
            <p className="text-gray-300">Free premium features for all early adopters during our launch period</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Lightning Fast Setup</h3>
            <p className="text-gray-300">Get started in under 60 seconds—no complex configuration required</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Shape the Future</h3>
            <p className="text-gray-300">Your feedback helps us build the perfect AI reading experience</p>
          </div>
        </div>

        {/* Launch Stats */}
        <div 
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <div className="text-center">
            <div className="stat-number text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent" data-target="0">0</div>
            <div className="text-gray-400 text-sm md:text-base">Early Adopters</div>
            <div className="text-xs text-gray-500 mt-1">Join the first wave!</div>
          </div>
          
          <div className="text-center">
            <div className="stat-number text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-target="100">0</div>
            <div className="text-gray-400 text-sm md:text-base">% Free Features</div>
            <div className="text-xs text-gray-500 mt-1">During launch</div>
          </div>
          
          <div className="text-center">
            <div className="stat-number text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent" data-target="60">0</div>
            <div className="text-gray-400 text-sm md:text-base">Second Setup</div>
            <div className="text-xs text-gray-500 mt-1">Quick start</div>
          </div>
          
          <div className="text-center">
            <div className="stat-number text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent" data-target="24">0</div>
            <div className="text-gray-400 text-sm md:text-base">Hour Support</div>
            <div className="text-xs text-gray-500 mt-1">Launch period</div>
          </div>
        </div>

        {/* Launch Badge */}
        <div className="mt-12 inline-flex items-center space-x-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 px-6 py-3 rounded-full">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 font-semibold">🚀 Now Live - Launch Week Special!</span>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
};

export default CTASection;
