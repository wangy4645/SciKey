import React from 'react';

interface MeshLogoProps {
  size?: number;
  color?: string;
}

const MeshLogo: React.FC<MeshLogoProps> = ({ size = 32, color = '#1890ff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 更多节点的不规则分布 - 参考Adobe Stock原始设计 */}
      <circle cx="6" cy="6" r="1.8" fill={color} />
      <circle cx="18" cy="6" r="1.6" fill={color} opacity="0.9" />
      <circle cx="6" cy="18" r="1.6" fill={color} opacity="0.9" />
      <circle cx="18" cy="18" r="1.6" fill={color} opacity="0.9" />
      <circle cx="12" cy="12" r="1.8" fill={color} opacity="0.8" />
      <circle cx="9" cy="9" r="1.4" fill={color} opacity="0.85" />
      <circle cx="15" cy="9" r="1.4" fill={color} opacity="0.85" />
      <circle cx="9" cy="15" r="1.4" fill={color} opacity="0.85" />
      <circle cx="15" cy="15" r="1.4" fill={color} opacity="0.85" />
      
      {/* 复杂的连接线网络 - 全部改为虚线 */}
      <line x1="6" y1="6" x2="18" y2="6" stroke={color} strokeWidth="1.4" opacity="0.8" strokeDasharray="2,2" />
      <line x1="6" y1="6" x2="6" y2="18" stroke={color} strokeWidth="1.4" opacity="0.8" strokeDasharray="2,2" />
      <line x1="6" y1="6" x2="12" y2="12" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="6" y1="6" x2="9" y2="9" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="18" y1="6" x2="18" y2="18" stroke={color} strokeWidth="1.4" opacity="0.8" strokeDasharray="2,2" />
      <line x1="18" y1="6" x2="12" y2="12" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="18" y1="6" x2="15" y2="9" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="6" y1="18" x2="18" y2="18" stroke={color} strokeWidth="1.4" opacity="0.8" strokeDasharray="2,2" />
      <line x1="6" y1="18" x2="12" y2="12" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="6" y1="18" x2="9" y2="15" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="18" y1="18" x2="12" y2="12" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="18" y1="18" x2="15" y2="15" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="9" y1="9" x2="15" y2="9" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="9" y1="9" x2="9" y2="15" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="9" y1="9" x2="12" y2="12" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="15" y1="9" x2="15" y2="15" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="15" y1="9" x2="12" y2="12" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="9" y1="15" x2="15" y2="15" stroke={color} strokeWidth="1.2" opacity="0.7" strokeDasharray="2,2" />
      <line x1="9" y1="15" x2="12" y2="12" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      <line x1="15" y1="15" x2="12" y2="12" stroke={color} strokeWidth="1.0" opacity="0.6" strokeDasharray="2,2" />
      
      {/* 数据流动效果 */}
      <circle cx="12" cy="6" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="12" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
      </circle>
      <circle cx="12" cy="18" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
      </circle>
      <circle cx="6" cy="12" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
      </circle>
      <circle cx="12" cy="12" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.8s" />
      </circle>
      <circle cx="9" cy="9" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="1.0s" />
      </circle>
      <circle cx="15" cy="15" r="0.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="1.2s" />
      </circle>
    </svg>
  );
};

export default MeshLogo; 