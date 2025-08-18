import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const floatingShape1Ref = useRef<HTMLDivElement>(null);
  const floatingShape2Ref = useRef<HTMLDivElement>(null);
  const floatingShape3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!footerRef.current) return;

    const footer = footerRef.current;
    const content = contentRef.current;
    const logo = logoRef.current;
    const links = linksRef.current;
    const social = socialRef.current;
    const bottom = bottomRef.current;
    const wave = waveRef.current;
    const floatingShape1 = floatingShape1Ref.current;
    const floatingShape2 = floatingShape2Ref.current;
    const floatingShape3 = floatingShape3Ref.current;

    // Initial setup
    gsap.set([content, logo, links, social, bottom], {
      opacity: 0,
      y: 50
    });

    gsap.set([floatingShape1, floatingShape2, floatingShape3], {
      scale: 0,
      rotation: 0
    });

    gsap.set(wave, {
      scaleY: 0,
      transformOrigin: "bottom center"
    });

    // Main animation sequence
    ScrollTrigger.create({
      trigger: footer,
      start: "top 90%",
      end: "bottom 20%",
      onEnter: () => {
        const tl = gsap.timeline();

        // Wave animation
        tl.to(wave, {
          scaleY: 1,
          duration: 1.5,
          ease: "power2.out"
        })

        // Content animations
        .to(content, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out"
        }, "-=1")

        .to(logo, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "back.out(1.7)"
        }, "-=0.6")

        .to(links, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out"
        }, "-=0.5")

        .to(social, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out"
        }, "-=0.6")

        .to(bottom, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out"
        }, "-=0.4")

        // Floating shapes
        .to([floatingShape1, floatingShape2, floatingShape3], {
          scale: 1,
          duration: 1,
          ease: "back.out(1.7)",
          stagger: 0.1
        }, "-=1");
      }
    });

    // Continuous floating animations
    if (floatingShape1) {
      gsap.to(floatingShape1, {
        y: "+=15",
        rotation: "+=5",
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    }

    if (floatingShape2) {
      gsap.to(floatingShape2, {
        y: "+=20",
        x: "+=10",
        rotation: "-=10",
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1
      });
    }

    if (floatingShape3) {
      gsap.to(floatingShape3, {
        y: "+=12",
        rotation: "+=15",
        duration: 3.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 2
      });
    }

    // Parallax effect for floating shapes
    ScrollTrigger.create({
      trigger: footer,
      start: "top bottom",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        
        if (floatingShape1) {
          gsap.set(floatingShape1, {
            y: progress * -30
          });
        }
        
        if (floatingShape2) {
          gsap.set(floatingShape2, {
            y: progress * 20
          });
        }
        
        if (floatingShape3) {
          gsap.set(floatingShape3, {
            y: progress * -15
          });
        }
      }
    });

    // Link hover animations
    const footerLinks = footer.querySelectorAll('.footer-link');
    footerLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        gsap.to(link, {
          x: 5,
          color: '#ffffff',
          duration: 0.3,
          ease: "power2.out"
        });
      });
      
      link.addEventListener('mouseleave', () => {
        gsap.to(link, {
          x: 0,
          color: '#d1d5db',
          duration: 0.3,
          ease: "power2.out"
        });
      });
    });

    // Social icon animations
    const socialIcons = footer.querySelectorAll('.social-icon');
    socialIcons.forEach(icon => {
      icon.addEventListener('mouseenter', () => {
        gsap.to(icon, {
          scale: 1.2,
          rotation: 10,
          duration: 0.3,
          ease: "back.out(1.7)"
        });
      });
      
      icon.addEventListener('mouseleave', () => {
        gsap.to(icon, {
          scale: 1,
          rotation: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white overflow-hidden"
    >
      {/* Animated Wave */}
      <div 
        ref={waveRef}
        className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"
        style={{
          clipPath: "polygon(0 100%, 100% 100%, 100% 0%, 0 50%)"
        }}
      />

      {/* Floating Shapes */}
      <div 
        ref={floatingShape1Ref}
        className="absolute top-20 left-20 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full"
      />
      <div 
        ref={floatingShape2Ref}
        className="absolute top-32 right-24 w-12 h-12 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-2xl"
      />
      <div 
        ref={floatingShape3Ref}
        className="absolute bottom-20 left-1/3 w-10 h-10 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-lg"
      />

      {/* Main Content */}
      <div 
        ref={contentRef}
        className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Company Info */}
          <div ref={logoRef} className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Thesyx
              </h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-6 max-w-md">
              Revolutionizing how you interact with documents through AI-powered reading experiences. 
              Join the future of intelligent document processing.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Launch Week Active</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div ref={linksRef}>
            <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Quick Links
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/" className="footer-link text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                  <svg className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="footer-link text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                  <svg className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v0H8v0z" />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/use-cases" className="footer-link text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                  <svg className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Use Cases
                </Link>
              </li>
              <li>
                <Link to="/register" className="footer-link text-gray-300 hover:text-white transition-colors duration-200 flex items-center group">
                  <svg className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect & Support */}
          <div ref={socialRef}>
            <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Connect
            </h4>
            <div className="space-y-4 mb-8">
              <p className="text-gray-300">
                <span className="font-medium">Launch Support:</span>
                <br />
                <a 
                  href="mailto:launch@thesyx.com" 
                  className="footer-link text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  launch@thesyx.com
                </a>
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Feedback:</span>
                <br />
                <a 
                  href="mailto:feedback@thesyx.com" 
                  className="footer-link text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  feedback@thesyx.com
                </a>
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex space-x-4">
              <a href="#" className="social-icon w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="social-icon w-10 h-10 bg-gray-700 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="#" className="social-icon w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div 
          ref={bottomRef}
          className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center"
        >
          <div className="text-gray-400 mb-4 md:mb-0">
            <p>&copy; {currentYear} Thesyx. All rights reserved.</p>
            <p className="text-sm text-gray-500 mt-1">
              Built with ❤️ for the future of intelligent reading
            </p>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <Link to="/privacy" className="footer-link hover:text-white transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link to="/terms" className="footer-link hover:text-white transition-colors duration-200">
              Terms of Service
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Launch Status: Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
    </footer>
  );
};

export default Footer;
