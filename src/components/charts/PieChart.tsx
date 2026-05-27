'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { ComponentProps } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart(props: ComponentProps<typeof Pie>) {
  return <Pie {...props} />;
}
