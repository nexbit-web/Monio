<script lang="ts">
	/**
	 * Documentation in English. Section titles are in docs.ts, blocks in ui/.
	 * The website is in Russian and the bot in Ukrainian, so on-screen names
	 * are quoted as they appear, with a translation where it helps.
	 */
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Languages from '@lucide/svelte/icons/languages';
	import Lock from '@lucide/svelte/icons/lock';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import NavIcon from '$lib/components/nav-icon.svelte';
	import Section from './section.svelte';
	import Bars from './ui/bars.svelte';
	import Callout from './ui/callout.svelte';
	import Chat from './ui/chat.svelte';
	import Commands from './ui/commands.svelte';
	import Copy from './ui/copy.svelte';
	import Examples from './ui/examples.svelte';
	import Faq from './ui/faq.svelte';
	import Features from './ui/features.svelte';
	import Figure from './ui/figure.svelte';
	import Formula from './ui/formula.svelte';
	import SiteArt from './ui/site-art.svelte';
	import Step from './ui/step.svelte';
	import Steps from './ui/steps.svelte';
	import { CARD_CHAT, FAMILY_CHAT, KEYBOARD, LEARN_CHAT, WRITE_CHAT } from './examples';
</script>

<Section lang="en" id="start" lead="Three steps, and you can record spending from your phone.">
	<Steps>
		<Step title="Check your accounts">
			<p>
				Open <a href="/accounts">Счета</a> (Accounts) — «Карта» (card) and «Наличные» (cash) are already
				there. Set each one's opening balance: how much money is on it right now.
			</p>
		</Step>
		<Step title="Connect the Telegram bot">
			<p>
				<a href="/settings#telegram">Настройки → Telegram-бот</a> (Settings → Telegram bot) →
				<span class="key">Подключить Telegram</span>. The bot opens — press Start. The link works
				once and lasts 15 minutes.
			</p>
		</Step>
		<Step title="Record your first expense">
			<p>
				Send the bot <Copy text="250 продукты" /> ("250 groceries") — the record shows up in
				<a href="/transactions">Операции</a> (Transactions) right away.
			</p>
		</Step>
	</Steps>
</Section>

<Section
	lang="en"
	id="features"
	lead="The Telegram bot and the website share the same data. The bot runs on a server, so your computer can stay off."
>
	<Features
		items={[
			{
				icon: MessageSquareText,
				title: 'One message',
				text: '"250 продукты" and the expense is recorded. The bot works out the amount, category and account.'
			},
			{
				icon: ShoppingBasket,
				title: 'Knows products',
				text: 'About 1,100 Russian and Ukrainian words: apples, bread, socks, washing powder.'
			},
			{
				icon: PencilLine,
				title: 'Learns from corrections',
				text: 'Fix a category once and the bot remembers the word next time.'
			},
			{
				icon: Users,
				title: 'Family spending',
				text: '"a jacket for my sister" or "medicine for mum" goes to Family, not Clothes or Health.'
			},
			{
				icon: ChartColumn,
				title: 'Where the money goes',
				text: 'The month by category, spending pace, and analytics for six months or a year.'
			},
			{
				icon: Gauge,
				title: 'Limits',
				text: 'Set how much you want to spend and Monio warns you when you go over.'
			},
			{
				icon: Wallet,
				title: 'All your accounts',
				text: 'Card, cash, savings. Balances are calculated for you.'
			},
			{
				icon: Languages,
				title: 'Two languages',
				text: 'The bot replies in Ukrainian and understands both Ukrainian and Russian.'
			}
		]}
	/>
</Section>

<Section
	lang="en"
	id="bot-write"
	lead="An amount and what it was for — in any order, in one message."
>
	<p>
		The bot finds the amount, guesses the category, records it to your main account and replies with
		a card: what was recorded and how much you have spent in that category this month. The examples
		use Russian and Ukrainian words, because that is what the bot understands.
	</p>
	<Figure
		caption="A message and the bot's reply. At the bottom is the keyboard with the main buttons."
	>
		<Chat
			messages={WRITE_CHAT}
			keyboard={KEYBOARD}
			label="The message «250 продукти атб» and the bot's reply: a 250 ₴ expense in groceries"
		/>
	</Figure>

	<h3>Examples</h3>
	<p class="muted">Click an example to copy it, then send it to the bot.</p>
	<Examples
		groups={[
			{
				title: 'Amounts',
				rows: [
					{ say: 'кофе 65,50', get: '65.50 ₴ — kopecks after a comma or a dot' },
					{ say: '1 250 атб', get: '1,250 ₴ — a space between thousands is fine' },
					{ say: '2к фриланс', get: '2,000 ₴ — "к" means thousand' },
					{ say: '120+80 обед', get: '200 ₴ — the bot adds them up' }
				]
			},
			{
				title: 'Income or expense',
				rows: [
					{ say: '+30000 зарплата', get: 'a plus before the amount — income (salary)' },
					{ say: '-450 куртка', get: 'a minus — definitely an expense' },
					{ say: 'продал куртку 2000', get: 'no sign: the bot decides — income «Продажа» (sale)' }
				]
			},
			{
				title: 'Date',
				rows: [
					{ say: 'вчера такси 180', get: 'recorded for yesterday ("вчера", "вчора")' },
					{ say: 'позавчера кино 300', get: 'for the day before yesterday' }
				]
			},
			{
				title: 'Account',
				rows: [
					{ say: '250 обед нал', get: 'from cash: "нал", "наличными", "готівкою"' },
					{ say: '250 кофе карта', get: 'from the card: "карта", "картка", "безнал"' },
					{ say: '500 бензин моно', get: 'from an account by its name, if you have one' }
				]
			},
			{
				title: 'Amount only',
				rows: [{ say: '250', get: 'the bot asks you to pick a category with a button' }]
			}
		]}
	/>
	<Callout>
		<p>
			Want to pick the category first? Press <span class="key">− Витрата</span> (expense) or
			<span class="key">+ Дохід</span> (income), choose it, then send the amount. The bot waits 15 minutes.
		</p>
	</Callout>
	<p class="muted">
		The category name is left out of the comment: «продукты атб» → comment "атб". There's no need to
		write "грн" (UAH). The bot doesn't record voice messages or photos — text only.
	</p>
</Section>

<Section
	lang="en"
	id="bot-card"
	lead="Every record comes with buttons. Made a mistake? Fix it in one tap."
>
	<Figure caption="A record card and its buttons">
		<Chat messages={CARD_CHAT} numbered label="A record card with four buttons" />
	</Figure>
	<ol class="legend">
		<li>
			<b>Категорія</b> (category) — pick another category. It also has «Це дохід» ("this is income") in
			case the bot mixed up income and expense.
		</li>
		<li><b>Рахунок</b> (account) — move the record to another account.</li>
		<li><b>Змінити</b> (edit) — change the amount, comment or date.</li>
		<li><b>Видалити</b> (delete) — delete the record.</li>
	</ol>

	<h3>What you can edit</h3>
	<div class="doc-table">
		<table>
			<thead><tr><th>Button</th><th>What it does</th></tr></thead>
			<tbody>
				<tr>
					<td><span class="key">💰 Сума</span></td>
					<td>Send the new amount as a number, for example <code>320</code>.</td>
				</tr>
				<tr>
					<td><span class="key">📝 Опис</span></td>
					<td>Send a new comment — or press «Прибрати опис» to clear it.</td>
				</tr>
				<tr>
					<td><span class="key">⏪ −1 день</span> <span class="key">+1 день ⏩</span></td>
					<td>Move the date by a day. Forward no later than today.</td>
				</tr>
			</tbody>
		</table>
	</div>
	<Callout>
		<p>
			The bot waits 15 minutes for a new amount or comment. Press any other button and the edit is
			cancelled. You can also delete the last record with <Copy text="/undo" /> — the bot asks first.
		</p>
	</Callout>
</Section>

<Section
	lang="en"
	id="bot-keys"
	lead="At the bottom of the chat there is a keyboard with the main buttons."
>
	<p>
		Collapse the keyboard with the arrow in the input field and open it again with the four-dots
		icon. If it's gone completely, send the bot <Copy text="меню" /> (menu).
	</p>
	<p>
		All commands are in the table: copy a command and send it to the bot, or press the same button
		in the chat.
	</p>
	<Commands
		items={[
			{
				cmd: '/expense',
				key: '− Витрата',
				text: 'Record an expense: pick a category, then send the amount'
			},
			{ cmd: '/income', key: '+ Дохід', text: 'The same for income' },
			{
				cmd: '/today',
				key: '📊 Сьогодні',
				text: "The day's transactions; «‹» goes to earlier days"
			},
			{
				cmd: '/month',
				key: '📅 Місяць',
				text: "The month's summary: income, expenses, where the money went, limits and a comparison with last month"
			},
			{
				cmd: '/balance',
				key: '💳 Рахунки',
				text: 'Account balances; press an account to make it the main one'
			},
			{ cmd: '/last', key: '🧾 Історія', text: 'Recent transactions, 10 at a time, with paging' },
			{ cmd: '/undo', key: '↩️ Скасувати', text: 'Delete the last record — the bot asks first' },
			{
				cmd: '/categories',
				key: '🏷 Категорії',
				text: 'Categories and the words the bot recognises them by'
			},
			{ cmd: '/commands', key: '📋 Команди', text: 'All commands as buttons' },
			{ cmd: '/menu', key: '‹ Назад', text: 'Bring back the main buttons' },
			{ cmd: '/help', key: '❓ Допомога', text: 'A short help message in the chat' }
		]}
	/>
	<p class="muted">
		Commands also work as plain words in Ukrainian or Russian: "сьогодні" / "сегодня" (today),
		"місяць" (month), "баланс", "історія" (history), "скасувати" (undo). A message with digits is
		always a record: «сьогодні 250 кава» records a coffee.
	</p>
</Section>

<Section
	lang="en"
	id="categorize"
	lead="The bot looks at the words in your message and picks the category they fit best."
>
	<p>The rules, from strongest to weakest:</p>
	<Steps>
		<Step title="A category picked with a button">
			<p>
				If you pressed «− Витрата» and chose a category before the amount, the record goes there.
			</p>
		</Step>
		<Step title="Who it was for">
			<p>
				Anything bought for a relative goes to Семья (family). This beats any product: <Copy
					text="сестре куртка 2000"
				/> (a jacket for my sister) is family, not clothes.
			</p>
		</Step>
		<Step title="Your keywords">
			<p>
				Words listed in <a href="/categories">Категории</a> (Categories) and the ones the bot
				learned:
				<Copy text="такси 180" /> (taxi) — transport.
			</p>
		</Step>
		<Step title="The product dictionary">
			<p>
				About 1,100 Russian and Ukrainian words: <Copy text="носки 150" /> (socks) — clothes,
				<Copy text="хліб 25" /> (bread) — groceries.
			</p>
		</Step>
		<Step title="The start of a word">
			<p>The keyword «продукт» catches «продукты» and «продуктов» too.</p>
		</Step>
	</Steps>
	<Callout>
		<p>
			Shops are weaker than products: <Copy text="атб порошок 200" /> (washing powder at ATB) is household,
			while just <Copy text="250 атб" /> is groceries.
		</p>
	</Callout>

	<h3>Family spending</h3>
	<p>
		If you say which relative it was for, the expense goes to family — even when the message names a
		product. The bot understands маме / мамі (to mum), папе / татові (to dad), брату (brother),
		сестре / сестрі (sister), бабушке / бабусі (grandma), дедушке (grandpa), сыну (son), дочке
		(daughter), жене (wife), мужу (husband), детям (children), родителям (parents) and «для мамы»
		(for mum).
	</p>
	<Examples
		groups={[
			{
				rows: [
					{ say: 'сестре куртка 2000', get: 'family, not clothes' },
					{ say: 'маме лекарства 450', get: 'family, not health' },
					{ say: 'папе дал денег 500', get: 'family' },
					{ say: 'для мамы торт 600', get: 'family' }
				]
			}
		]}
	/>
	<Figure caption="A jacket for my sister and medicine for mum — both go to family">
		<Chat messages={FAMILY_CHAT} label="Spending on a sister and on mum, both recorded as family" />
	</Figure>
	<Callout kind="warn">
		<p>
			«від мами 500» (from mum) or «мама дала» (mum gave) is money given to you, not spent on mum.
			Record it as income: <Copy text="+500 від мами" />
		</p>
	</Callout>

	<h3>How the bot learns</h3>
	<Steps>
		<Step title="You write a word the bot doesn't know">
			<p>For example, <Copy text="чебурек 90" /> (a pastry).</p>
		</Step>
		<Step title="You pick a category">
			<p>The bot shows category buttons — press «Кафе и рестораны» (cafés and restaurants).</p>
		</Step>
		<Step title="The bot remembers the word">
			<p>Next time "чебурек" goes straight to cafés.</p>
		</Step>
	</Steps>
	<Figure caption="The bot doesn't know the word and asks you to pick a category">
		<Chat messages={LEARN_CHAT} label="The bot asks for a category for the word «чебурек»" />
	</Figure>
	<p>
		Fixing a category with «Категорія» teaches it too. Learned words are listed in
		<a href="/categories">Категории</a>, where you can add your own: a stem without the ending,
		comma-separated. Your own word always beats the dictionary.
	</p>
	<p class="muted">
		"For whom" words («маме») and choosing «Другое» (other) are not remembered — that's a fix for
		one record, not a rule.
	</p>
</Section>

<Section
	lang="en"
	id="site"
	lead="Everything you record in the bot is on the website: by month, category and account."
>
	<Figure>
		<SiteArt
			label="The Monio window: sections column, the month's figures, spending by category and pace"
		/>
	</Figure>
	<p>
		The sections are in the column on the left (on a phone, in the bar at the bottom). The «+»
		button at the top of the column adds a transaction from any section. Click a category, a table
		cell or an account to see its transactions. The website interface is in Russian.
	</p>
	<div class="doc-table">
		<table>
			<thead><tr><th>Section</th><th>What's there</th></tr></thead>
			<tbody>
				<tr>
					<td><span class="navcell"><NavIcon name="overview" size={16} /> Обзор</span></td>
					<td
						>Overview: income, expenses, balance, where the money goes and spending pace for the
						month.</td
					>
				</tr>
				<tr>
					<td><span class="navcell"><NavIcon name="transactions" size={16} /> Операции</span></td>
					<td
						>Every record: filter by category, account and dates, search comments, export to CSV.</td
					>
				</tr>
				<tr>
					<td><span class="navcell"><NavIcon name="stats" size={16} /> Аналитика</span></td>
					<td>3, 6 or 12 months: average income and spending, savings rate, spending by month.</td>
				</tr>
				<tr>
					<td><span class="navcell"><NavIcon name="categories" size={16} /> Категории</span></td>
					<td>Names, icons, keywords for the bot and limits. Archive what you don't need.</td>
				</tr>
				<tr>
					<td><span class="navcell"><NavIcon name="accounts" size={16} /> Счета</span></td>
					<td>Cards, cash, savings, their balances and the main account.</td>
				</tr>
				<tr>
					<td><span class="navcell"><NavIcon name="settings" size={16} /> Настройки</span></td>
					<td
						>Theme, time zone, password, devices, the Telegram bot and exporting all transactions.</td
					>
				</tr>
			</tbody>
		</table>
	</div>
</Section>

<Section
	lang="en"
	id="limits"
	lead="Set how much you want to spend in a category each month, and Monio shows how much is left."
>
	<Steps>
		<Step title="Open Categories">
			<p><a href="/categories">Категории</a> → «Изменить» (edit) next to the category.</p>
		</Step>
		<Step title="Enter the limit">
			<p>The «Лимит в месяц» (monthly limit) field. Leave it empty for no limit.</p>
		</Step>
	</Steps>
	<Figure caption="Example: how much of the limit is spent. Going over shows in red.">
		<Bars
			title="This month's limits"
			of="of"
			over="over the limit by"
			items={[
				{ icon: 'groceries', name: 'Groceries', spent: 3450, limit: 5000 },
				{ icon: 'cafe', name: 'Cafés and restaurants', spent: 2400, limit: 2000 },
				{ icon: 'transport', name: 'Transport', spent: 640, limit: 1500 }
			]}
		/>
	</Figure>
	<p>
		The limit bar appears on the Overview. After each expense the bot says how much you've spent in
		that category and warns you when the limit is exceeded. The month summary — <Copy
			text="/month"
		/> — lists every exceeded limit.
	</p>
</Section>

<Section lang="en" id="accounts" lead="Monio works out how much money is on each account.">
	<Figure caption="How an account balance is calculated">
		<Formula terms={['Opening balance', 'Income', 'Expenses', 'Transfers', 'Balance']} />
	</Figure>
	<div class="doc-table">
		<table>
			<thead><tr><th>Transaction</th><th>What it is</th></tr></thead>
			<tbody>
				<tr><td>Expense</td><td>Money went out: groceries, a taxi, a subscription.</td></tr>
				<tr><td>Income</td><td>Money came in: salary, freelance work, cashback.</td></tr>
				<tr>
					<td>Transfer</td>
					<td>
						Money moved between your own accounts — say, cash withdrawn from a card. It's neither
						income nor an expense: only the balances change.
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<ul>
		<li>
			<b>Opening balance</b> — what the account held when you started tracking. It can be negative, for
			a credit card for example.
		</li>
		<li>
			<b>Main account</b> — where the bot records. Change it in <a href="/accounts">Счета</a> or in
			the bot:
			<Copy text="/balance" /> → press the account. For a single record, name it in the message:
			<Copy text="250 кофе нал" />
		</li>
		<li>
			<b>Transfers</b> are made on the website: new transaction → «Перевод» (transfer) → from and to accounts.
			The bot can't record transfers.
		</li>
		<li>
			<b>Archive</b> hides an account but keeps its transactions. Only an account with no transactions
			can be deleted for good.
		</li>
	</ul>
</Section>

<Section lang="en" id="safety" lead="Only you can see your data.">
	<Features
		items={[
			{
				icon: Lock,
				title: 'Your own account',
				text: 'Each person sees only their own transactions, accounts and categories. Someone else gets a separate account, created by the Monio owner.'
			},
			{
				icon: ShieldCheck,
				title: 'Guessing protection',
				text: 'Passwords are at least 10 characters. After 5 wrong attempts, sign-in for that email is blocked for 15 minutes.'
			},
			{
				icon: MonitorSmartphone,
				title: 'Devices',
				text: 'Changing the password signs out every other device. In Settings you can sign out everywhere except here.'
			},
			{
				icon: BellRing,
				title: 'Only your Telegram',
				text: 'The bot answers only connected Telegram accounts. Every new connection triggers a warning.'
			}
		]}
	/>
	<Callout kind="warn">
		<p>
			Don't share your email and password: that person would see and could change all of your data.
		</p>
	</Callout>
</Section>

<Section lang="en" id="faq">
	<div class="faqs">
		<Faq q="The buttons at the bottom of the chat are gone">
			<p>
				Send the bot <Copy text="меню" /> and they come back. They may just be collapsed: tap the four-dots
				icon in the input field.
			</p>
		</Faq>
		<Faq q="The bot picked the wrong category">
			<p>
				Under the record, press <span class="key">🏷 Категорія</span> and choose the right one. The bot
				remembers the word and gets it right next time.
			</p>
		</Faq>
		<Faq q="Wrong account, amount or date">
			<p>
				Account — <span class="key">💳 Рахунок</span>; amount, comment and date —
				<span class="key">✏️ Змінити</span>. Or open the transaction on the website and change any
				field.
			</p>
		</Faq>
		<Faq q="Income recorded as an expense">
			<p>
				<span class="key">🏷 Категорія</span> → <span class="key">↔️ Це дохід</span>. Next time put
				"+" before the amount.
			</p>
		</Faq>
		<Faq q="How do I delete a record?">
			<p>
				<span class="key">✕ Видалити</span> under the record, or <Copy text="/undo" /> for the last one.
				On the website, open the transaction and press «Удалить» (delete).
			</p>
		</Faq>
		<Faq q="How do I record a transfer between accounts?">
			<p>Only on the website: new transaction → «Перевод» → from and to accounts.</p>
		</Faq>
		<Faq q="Why does «від мами 500» have no category?">
			<p>
				That's money you were given, not spending on mum. Record it with a plus: <Copy
					text="+500 від мами"
				/>
			</p>
		</Faq>
		<Faq q="Can I connect a second phone?">
			<p>
				Yes: <a href="/settings#telegram">Настройки → Telegram-бот</a> →
				<span class="key">Подключить ещё один Telegram</span>.
			</p>
		</Faq>
		<Faq q="How do I export transactions to Excel?">
			<p>
				All transactions — <a href="/settings">Настройки → Данные</a> (Settings → Data). Only the
				filtered ones — the «CSV» button in <a href="/transactions">Операции</a>. The file opens in
				Excel and Google Sheets.
			</p>
		</Faq>
		<Faq q="An expense landed on the wrong day">
			<p>
				Check your time zone: <a href="/settings">Настройки → Профиль</a> (Settings → Profile). Monio
				uses it to decide where a day and a month end.
			</p>
		</Faq>
		<Faq q="How do I turn on dark mode?">
			<p>
				<a href="/settings">Настройки</a> → «Режим» (mode): light, dark or follow the system. The side
				column colour is there too.
			</p>
		</Faq>
		<Faq q="The bot doesn't answer">
			<p>
				Check in <a href="/settings#telegram">Настройки</a> that your Telegram is connected. If the bot
				says "прив'яжи акаунт" (link your account), connect it again. The bot runs on a server; your computer
				isn't needed.
			</p>
		</Faq>
	</div>
</Section>
