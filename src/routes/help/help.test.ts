import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import { LANGS, SECTIONS, UI, isLang } from './docs';
import { load } from './+page.server';

const page = (lang: (typeof LANGS)[number]) =>
	render(Page, { props: { data: { lang } } as never }).body;

describe('справка «Как пользоваться»', () => {
	it.each(LANGS)('%s: все разделы по одному разу, с заголовками из оглавления', (lang) => {
		const body = page(lang);
		for (const id of SECTIONS) {
			expect(body.split(`<section id="${id}"`).length - 1, id).toBe(1);
			expect(body, id).toContain(UI[lang].sections[id]);
		}
		expect(body.split('<section ').length - 1).toBe(SECTIONS.length);
	});

	it.each(LANGS)('%s: ссылки-якоря ведут на существующие разделы', (lang) => {
		const anchors = [...page(lang).matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
		expect(anchors.length).toBeGreaterThan(SECTIONS.length);
		for (const id of anchors) expect(SECTIONS as readonly string[]).toContain(id);
	});

	it('переключатель языка ведёт на все три языка и отмечает текущий', () => {
		const body = page('uk');
		for (const l of LANGS) expect(body).toContain(`href="?lang=${l}"`);
		expect(body).toMatch(/href="\?lang=uk"[^>]*aria-current="page"/);
	});

	it('язык: из ссылки — и запоминается, иначе из cookie, иначе русский', () => {
		const jar = new Map<string, string>();
		const cookies = {
			get: (k: string) => jar.get(k),
			set: (k: string, v: string) => void jar.set(k, v)
		};
		const run = (search: string) =>
			load({ url: new URL(`http://x/help${search}`), cookies } as never) as { lang: string };

		expect(run('').lang).toBe('ru');
		expect(run('?lang=en').lang).toBe('en');
		expect(run('').lang).toBe('en');
		expect(run('?lang=xx').lang).toBe('en');
		expect(isLang('de')).toBe(false);
	});
});
