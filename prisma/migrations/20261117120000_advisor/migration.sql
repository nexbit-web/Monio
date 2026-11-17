-- Финансовый наставник: обязательные траты, отчёты в Telegram и цель накоплений.
-- Только новые столбцы со значениями по умолчанию — записи и суммы не меняются.

-- Обязательная трата: её наставник не предлагает урезать
ALTER TABLE "Category" ADD COLUMN "essential" BOOLEAN NOT NULL DEFAULT false;

-- Отчёты бота (неделя — в воскресенье, месяц — 1-го числа) и своя цель накоплений
ALTER TABLE "User" ADD COLUMN "weeklyReport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "monthlyReport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastWeeklyReport" TEXT,
ADD COLUMN "lastMonthlyReport" TEXT,
ADD COLUMN "savingsGoal" INTEGER;

-- Стартовые категории, без которых не прожить, сразу отмечаем обязательными
-- (как у новых пользователей в defaults.ts). Потом это меняется в Категориях.
UPDATE "Category"
SET "essential" = true
WHERE kind = 'EXPENSE'
	AND name IN (
		'Продукты',
		'Транспорт',
		'Авто',
		'Жильё',
		'Коммунальные услуги',
		'Мобильная связь',
		'Интернет и ТВ',
		'Здоровье',
		'Питомцы',
		'Кредиты и комиссии'
	);
