import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export default function RequiredLabel({ children, help }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>*</span>
      <span>{children}</span>
      {help ? (
        <Tooltip title={help}>
          <InfoCircleOutlined style={{ opacity: 0.6 }} />
        </Tooltip>
      ) : null}
    </span>
  );
}
