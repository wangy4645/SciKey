import React from 'react';
import { Table as AntTable } from 'antd';
import type { TableProps } from 'antd';

const Table: React.FC<TableProps<any>> = (props) => {
  return <AntTable {...props} />;
};

export default Table; 