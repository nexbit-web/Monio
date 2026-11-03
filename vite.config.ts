import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Vercel: функции во Франкфурте (fra1) — рядом с базой Neon (eu-central-1),
			// иначе каждый запрос к базе ходил бы через океан. Node задан явно: если
			// Vercel соберёт на более новой версии (26), адаптер иначе откажется работать.
			adapter: adapter({ runtime: 'nodejs22.x', regions: ['fra1'] })
		})
	]
});
