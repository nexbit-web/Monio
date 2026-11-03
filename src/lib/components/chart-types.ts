export type ChartPoint = { x: number; y: number; label?: string };

export type ChartSeries = {
	id: string;
	label: string;
	/** css-цвет; по умолчанию берётся из --chart-N по порядку */
	color?: string;
	points: ChartPoint[];
	/** 'line' — линия с подписью последнего значения, 'dots' — только сырые точки */
	kind?: 'line' | 'dots';
};
