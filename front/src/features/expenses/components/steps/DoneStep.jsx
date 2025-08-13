// front/src/features/expenses/components/import-wizard/steps/DoneStep.jsx
import React from "react";
import { Space, Alert, Button } from "antd";

export default function DoneStep({ commitResult, onClose, onFix }) {
  const hasErrors = Array.isArray(commitResult?.errors) && commitResult.errors.length > 0;
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {hasErrors ? (
        <Alert
          type="warning"
          showIcon
          message="Bazı satırlar işlenemedi"
          description={<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(commitResult.errors, null, 2)}</pre>}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          message="İçe aktarma tamamlandı"
          description={<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(commitResult, null, 2)}</pre>}
        />
      )}
      <Space style={{ justifyContent: "flex-end", width: "100%" }}>
        {hasErrors && <Button onClick={() => onFix(commitResult.errors)}>Düzelt ve tekrar dene</Button>}
        <Button type="primary" onClick={onClose}>Kapat</Button>
      </Space>
    </Space>
  );
}

