import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugin once in this module
gsap.registerPlugin(ScrollTrigger);

// ImageCollage: Scroll-driven animations (no timeline)
// - Title and background accent zoom/fade on scroll
// - Each card zooms/fades into view with scrubbed ScrollTrigger
// - Dark blue/purple gradient with streaks and mouse glow for consistency
const ImageCollage = () => {
	const sectionRef = useRef<HTMLDivElement | null>(null);
	const titleRef = useRef<HTMLDivElement | null>(null);
	const cardsRef = useRef<HTMLDivElement | null>(null);
	const bgAccentRef = useRef<HTMLDivElement | null>(null);
	const glowRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const sectionEl = sectionRef.current;
		if (!sectionEl) return;

		const ctx = gsap.context(() => {
			const title = titleRef.current;
			const cardsContainer = cardsRef.current;
			const bgAccent = bgAccentRef.current;
			const glow = glowRef.current;
			const cards = cardsContainer ? Array.from(cardsContainer.querySelectorAll('[data-card]')) as HTMLElement[] : [];

			// Title: subtle rise + fade + slight scale-in on scroll
			if (title) {
				gsap.fromTo(
					title,
					{ opacity: 0, y: 28, scale: 0.98, willChange: 'transform, opacity', force3D: true },
					{ opacity: 1, y: 0, scale: 1, ease: 'power2.out', duration: 0.6,
						scrollTrigger: {
							trigger: sectionEl,
							start: 'top 80%',
							end: 'top 40%',
							scrub: 0.5,
							invalidateOnRefresh: true,
						}
					}
				);
			}

			// Background accent: soft scale/opacity/rotation as you scroll the section
			if (bgAccent) {
				gsap.fromTo(
					bgAccent,
					{ opacity: 0.3, scale: 1.06, rotate: 0.001, willChange: 'transform, opacity' },
					{ opacity: 0.9, scale: 1, rotate: 2, ease: 'power1.out',
						scrollTrigger: {
							trigger: sectionEl,
							start: 'top bottom',
							end: 'bottom top',
							scrub: 0.6,
							invalidateOnRefresh: true,
						}
					}
				);
			}

			// Cards: individual zoom/fade-in with scrub; slight stagger via different start offsets
			cards.forEach((card, index) => {
				gsap.fromTo(
					card,
					{ opacity: 0, y: 36, scale: 0.94, rotate: -2, willChange: 'transform, opacity', force3D: true },
					{ opacity: 1, y: 0, scale: 1, rotate: 0, ease: 'power2.out',
						scrollTrigger: {
							trigger: card,
							start: `top ${80 - index * 5}%`,
							end: `top ${40 - index * 5}%`,
							scrub: 0.5,
							invalidateOnRefresh: true,
						}
					}
				);
			});

			// Mouse-based glow: follows pointer with easing
			let onMove: ((e: PointerEvent) => void) | null = null;
			let onEnter: (() => void) | null = null;
			let onLeave: (() => void) | null = null;
			if (glow) {
				const toX = gsap.quickTo(glow, 'x', { duration: 0.25, ease: 'power2.out' });
				const toY = gsap.quickTo(glow, 'y', { duration: 0.25, ease: 'power2.out' });
				onMove = (e: PointerEvent) => {
					const rect = sectionEl.getBoundingClientRect();
					toX(e.clientX - rect.left);
					toY(e.clientY - rect.top);
				};
				onEnter = () => gsap.to(glow, { opacity: 0.9, duration: 0.25, ease: 'power2.out' });
				onLeave = () => gsap.to(glow, { opacity: 0.4, duration: 0.3, ease: 'power2.out' });
				sectionEl.addEventListener('pointermove', onMove);
				sectionEl.addEventListener('pointerenter', onEnter);
				sectionEl.addEventListener('pointerleave', onLeave);
				// init position center
				const r = sectionEl.getBoundingClientRect();
				gsap.set(glow, { x: r.width / 2, y: r.height / 2, opacity: 0.4 });
			}

			// Cleanup for glow listeners
			return () => {
				if (onMove) sectionEl.removeEventListener('pointermove', onMove);
				if (onEnter) sectionEl.removeEventListener('pointerenter', onEnter);
				if (onLeave) sectionEl.removeEventListener('pointerleave', onLeave);
			};
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative isolate w-full px-0 py-20 md:py-28 min-h-[110vh] md:min-h-[120vh] overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
			aria-label="Highlights"
		>
			{/* Full-bleed gradient base to cover side margins */}
			<div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen h-full -z-30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

			{/* Streaks layer (full-bleed) */}
			<div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen h-full -z-20 opacity-[0.35] bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_14px)]" />

			{/* Mouse glow (smaller, stronger) */}
			<div
				ref={glowRef}
				className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-[18rem] w-[18rem] rounded-full mix-blend-screen blur-2xl"
				style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.28), rgba(255,255,255,0.0) 60%)' }}
			/>

			{/* Soft gradient background accent behind cards (full-bleed) */}
			<div
				ref={bgAccentRef}
				className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen h-full -z-10"
			>
				<div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[120%] rounded-[50%] bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-500/20 blur-3xl" />
			</div>

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Title */}
				<div ref={titleRef} className="text-center max-w-2xl mx-auto">
					<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
						Experience smarter reading
					</h2>
					<p className="mt-3 text-base md:text-lg text-white/80">
						Upload books, listen with natural TTS, and ask contextual AI questions — all in one place.
					</p>
				</div>

				{/* Cards grid */}
				<div
					ref={cardsRef}
					className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10"
				>
					{/* Card 1 */}
					<div
						data-card
						className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xl"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="p-6 md:p-8">
							<h3 className="text-xl md:text-2xl font-semibold text-white">
								Seamless Text-to-Speech
							</h3>
							<p className="mt-2 text-sm md:text-base text-white/80">
								Listen to any uploaded book with buttery-smooth audio, auto-scroll, and precise text syncing.
							</p>
							<div className="mt-4 flex items-center gap-3 text-white/90">
								<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/25 border border-blue-400/40">1</span>
								<span className="text-sm md:text-base">Natural, expressive voices</span>
							</div>
						</div>
					</div>

					{/* Card 2 */}
					<div
						data-card
						className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xl"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="p-6 md:p-8">
							<h3 className="text-xl md:text-2xl font-semibold text-white">
								AI-Powered Understanding
							</h3>
							<p className="mt-2 text-sm md:text-base text-white/80">
								Ask questions about the content. Get fast, grounded answers with our RAG system.
							</p>
							<div className="mt-4 flex items-center gap-3 text-white/90">
								<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/25 border border-purple-400/40">2</span>
								<span className="text-sm md:text-base">Context-aware responses</span>
							</div>
						</div>
					</div>

					{/* Card 3 */}
					<div
						data-card
						className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xl md:col-span-2"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="p-6 md:p-8">
							<h3 className="text-xl md:text-2xl font-semibold text-white">
								Personal Library, Organized
							</h3>
							<p className="mt-2 text-sm md:text-base text-white/80">
								Upload, search, and manage your books with clean metadata and cover previews.
							</p>
							<div className="mt-4 flex flex-wrap items-center gap-3 text-white/90">
								<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/25 border border-indigo-400/40">3</span>
								<span className="text-sm md:text-base">Fast uploads and instant parsing</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ImageCollage; 