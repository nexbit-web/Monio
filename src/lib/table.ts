/**
 * Списки и панели в стиле ClickUp (из CRM LILY LOOK): сетка с линиями по
 * каждой клетке, шапка на ступень темнее, кнопки-пилюли в панели над
 * таблицей. Классы общие, чтобы страницы не разъезжались между собой.
 */

/** Клетка с линией справа; строка даёт линию снизу. Что не влезает — обрезается,
 *  а не налезает на соседнюю колонку. */
export const cell =
	'flex h-full min-w-0 items-center overflow-hidden border-r border-border px-2 whitespace-nowrap last:border-r-0';

/** Сама таблица: прижата к краям панели, линия сверху. */
export const table = 'border-t border-border bg-card';

/** Шапка: 32 px, оттенённый фон, мелкий серый текст. */
export const headRow =
	'grid h-8 border-b border-border bg-table-head text-[12px] text-muted-foreground';

/** Строка: 36 px, линия снизу, лёгкая подсветка под курсором. */
export const bodyRow =
	'grid h-9 w-full border-b border-border text-left text-[13px] transition-colors outline-none hover:bg-foreground/3 focus-visible:bg-foreground/5';

/** Кнопка-пилюля панели над таблицей; выбранная — в цвет темы. */
export const pill =
	'flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-foreground/4 hover:text-foreground';
export const pillActive =
	'flex h-6 items-center gap-1.5 rounded-full border border-transparent bg-violet/15 px-2.5 text-[12px] font-medium text-violet transition-colors hover:bg-violet/20';

/** Главная кнопка панели над таблицей: маленькая, в цвет темы. */
export const primaryAction =
	'flex h-6 items-center gap-1 rounded-[6px] bg-primary px-2.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50';
