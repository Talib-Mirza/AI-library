import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const floatingShape1Ref = useRef<HTMLDivElement>(null);
  const floatingShape2Ref = useRef<HTMLDivElement>(null);
  const floatingShape3Ref = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    if (!footerRef.current) return;

    const footer = footerRef.current;
    const logo = logoRef.current;
    const floatingShape1 = floatingShape1Ref.current;
    const floatingShape2 = floatingShape2Ref.current;
    const floatingShape3 = floatingShape3Ref.current;

    // Entrance animation
    gsap.set([logo, floatingShape1, floatingShape2, floatingShape3], {
      opacity: 0,
      y: 50
    });

    const entranceTrigger = ScrollTrigger.create({
      trigger: footer,
      start: "top 80%",
      onEnter: () => {
        const tl = gsap.timeline();
        
        tl.to(logo, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out"
        })
        .to([floatingShape1, floatingShape2, floatingShape3], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.2
        }, "-=0.5");
      },
      once: true
    });

    // Parallax effect for floating shapes
    const parallaxTrigger = ScrollTrigger.create({
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

    // Store our triggers
    triggersRef.current = [entranceTrigger, parallaxTrigger];

    return () => {
      // Only clean up this component's triggers
      triggersRef.current.forEach(trigger => trigger.kill());
      triggersRef.current = [];
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className="relative bg-gray-900 dark:bg-gray-950 text-white py-16 overflow-hidden"
    >
      {/* Floating decorative shapes */}
      <div ref={floatingShape1Ref} className="absolute top-10 left-10 w-16 h-16 bg-blue-500/20 rounded-full blur-sm" />
      <div ref={floatingShape2Ref} className="absolute top-20 right-20 w-12 h-12 bg-purple-500/20 rounded-lg blur-sm" />
      <div ref={floatingShape3Ref} className="absolute bottom-20 left-1/2 w-8 h-8 bg-pink-500/20 rounded-full blur-sm" />

      <div className="container mx-auto px-8 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div ref={logoRef} className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src="/images/Thesyx-Logo.png" 
                alt="Thesyx Logo" 
                className="h-10 w-auto"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Thesyx
              </span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              Transform your reading experience with AI-powered document chat and intelligent text-to-speech technology.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="social-icon text-gray-400 hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="social-icon text-gray-400 hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="social-icon text-gray-400 hover:text-white transition-colors duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/pricing" className="footer-link text-gray-300 hover:text-white transition-colors duration-300">Pricing</Link></li>
              <li><Link to="/use-cases" className="footer-link text-gray-300 hover:text-white transition-colors duration-300">Use Cases</Link></li>
              <li><Link to="/dashboard" className="footer-link text-gray-300 hover:text-white transition-colors duration-300">Dashboard</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="footer-link text-gray-300 hover:text-white transition-colors duration-300">Privacy Policy</Link></li>
              <li><Link to="/terms" className="footer-link text-gray-300 hover:text-white transition-colors duration-300">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} Thesyx. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <span className="text-gray-400 text-sm">Built with ❤️ for readers</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
