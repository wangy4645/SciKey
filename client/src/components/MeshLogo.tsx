import React from 'react';

interface MeshLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

const MeshLogo: React.FC<MeshLogoProps> = ({ 
  size = 28, 
  color = '#1890ff',
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 外圆环 */}
      <circle
        cx="16"
        cy="16"
        r="15"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />
      
      {/* 中心节点 */}
      <circle
        cx="16"
        cy="16"
        r="3"
        fill={color}
        opacity="0.9"
      />
      
      {/* 连接线 - 网格网络效果 */}
      <g stroke={color} strokeWidth="1.5" opacity="0.7">
        {/* 水平连接线 */}
        <line x1="8" y1="8" x2="24" y2="8" />
        <line x1="8" y1="16" x2="24" y2="16" />
        <line x1="8" y1="24" x2="24" y2="24" />
        
        {/* 垂直连接线 */}
        <line x1="8" y1="8" x2="8" y2="24" />
        <line x1="16" y1="8" x2="16" y2="24" />
        <line x1="24" y1="8" x2="24" y2="24" />
        
        {/* 对角线 - 增强网格效果 */}
        <line x1="8" y1="8" x2="24" y2="24" />
        <line x1="24" y1="8" x2="8" y2="24" />
      </g>
      
      {/* 节点点 */}
      <g fill={color} opacity="0.8">
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="16" cy="8" r="1.5" />
        <circle cx="24" cy="8" r="1.5" />
        <circle cx="8" cy="16" r="1.5" />
        <circle cx="24" cy="16" r="1.5" />
        <circle cx="8" cy="24" r="1.5" />
        <circle cx="16" cy="24" r="1.5" />
        <circle cx="24" cy="24" r="1.5" />
      </g>
      
      {/* 信号波纹效果 */}
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.3"
        strokeDasharray="2,2"
      />
      
      <circle
        cx="16"
        cy="16"
        r="18"
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0.2"
        strokeDasharray="1,3"
      />
    </svg>
  );
};

export default MeshLogo; 