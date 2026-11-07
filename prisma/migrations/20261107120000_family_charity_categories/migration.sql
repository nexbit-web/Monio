-- Две новые стартовые категории расходов: «Семья» и «Благотворительность».
-- Новым пользователям их создаёт initializeUser (defaults.ts). Тем, у кого
-- стартовые категории уже есть, добавляем здесь — перед «Другое», а если его
-- нет, то в конец. Категорию с таким же названием, заведённую вручную, не трогаем.
-- Записи, суммы и остальные категории не меняются — только порядок в списке.

-- освобождаем два места перед «Другое»
UPDATE "Category" c
SET "sortOrder" = c."sortOrder" + 2
FROM (
	SELECT "userId", MIN("sortOrder") AS pos
	FROM "Category"
	WHERE kind = 'EXPENSE' AND name = 'Другое'
	GROUP BY "userId"
) other
WHERE c."userId" = other."userId"
	AND c.kind = 'EXPENSE'
	AND c."sortOrder" >= other.pos;

INSERT INTO "Category" (id, "userId", kind, name, icon, keywords, "sortOrder")
SELECT
	replace(gen_random_uuid()::text, '-', ''),
	u.id,
	'EXPENSE'::"CategoryKind",
	n.name,
	n.icon,
	n.keywords,
	COALESCE(other.pos, tail.next, 0) + n.shift
FROM "User" u
CROSS JOIN (
	VALUES
		('Семья', 'family', ARRAY[]::text[], 0),
		('Благотворительность', 'charity', ARRAY['благотвор', 'благодийн']::text[], 1)
) AS n(name, icon, keywords, shift)
LEFT JOIN (
	-- «Другое» уже сдвинуто на 2 — его прежнее место свободно
	SELECT "userId", MIN("sortOrder") - 2 AS pos
	FROM "Category"
	WHERE kind = 'EXPENSE' AND name = 'Другое'
	GROUP BY "userId"
) other ON other."userId" = u.id
LEFT JOIN (
	SELECT "userId", MAX("sortOrder") + 1 AS next
	FROM "Category"
	WHERE kind = 'EXPENSE'
	GROUP BY "userId"
) tail ON tail."userId" = u.id
WHERE u."initializedAt" IS NOT NULL
ON CONFLICT ("userId", kind, name) DO NOTHING;
