export type PasswordStrength = {
	score: number; // 0-5
	label: string;
	color: string; // tailwind color class like 'bg-green-500'
	feedback: string;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
	if (!password) {
		return { score: 0, label: '', color: 'bg-red-500', feedback: '' };
	}
	let score = 0;
	const tips: string[] = [];
	if (password.length >= 8) score++; else tips.push('Use at least 8 characters');
	if (/\d/.test(password)) score++; else tips.push('Include at least one number');
	if (/[a-z]/.test(password)) score++; else tips.push('Include at least one lowercase letter');
	if (/[A-Z]/.test(password)) score++; else tips.push('Include at least one uppercase letter');
	if (/[^A-Za-z0-9]/.test(password)) score++; else tips.push('Include at least one special character');
	const levels = [
		{ label: 'Very Weak', color: 'bg-red-500' },
		{ label: 'Weak', color: 'bg-orange-500' },
		{ label: 'Fair', color: 'bg-yellow-500' },
		{ label: 'Good', color: 'bg-green-500' },
		{ label: 'Strong', color: 'bg-emerald-500' },
	];
	const idx = Math.max(0, Math.min(score - 1, levels.length - 1));
	return {
		score,
		label: levels[idx].label,
		color: levels[idx].color,
		feedback: tips.length ? tips.join(', ') : 'Strong password!',
	};
} 