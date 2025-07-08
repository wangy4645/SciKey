import React from 'react';
import { Pie } from '@ant-design/plots';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const config = {
    data,
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  return <Pie {...config} />;
};

export default PieChart; 