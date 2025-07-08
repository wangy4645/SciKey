import React from 'react';
import { Line } from '@ant-design/plots';

interface LineChartProps {
  data: Array<{
    date: string;
    traffic: number;
  }>;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const config = {
    data,
    xField: 'date',
    yField: 'traffic',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
  };

  return <Line {...config} />;
};

export default LineChart; 