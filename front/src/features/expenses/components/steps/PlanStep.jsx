// front/src/features/expenses/components/import-wizard/steps/PlanStep.jsx
import React from "react";
import { Space, Alert, Row, Col, Card, Collapse, List, Tag, Form, InputNumber, Switch, Button } from "antd";
import KpiCards from "../components/KpiCards";

export default function PlanStep({
  doPlan,
  planData,
  selectedCount,
  selectedTotalAmount,
  selectedTotalPaid,
  commitOpts,
  setCommitOpts,
  commitLoading,
  onBack,
  onCommit,
  onResolve,
}) {
  const missingAccount = planData?.summary?.missing_account_count ?? 0;
  const totalAmount = planData?.summary?.total_amount ?? selectedTotalAmount;
  const totalPaid = planData?.summary?.total_paid ?? selectedTotalPaid;

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {!planData && doPlan && (
        <Alert type="info" showIcon message="Plan verisi yükleniyor ya da oluşturulamadı." />
      )}

      <KpiCards count={selectedCount} totalAmount={totalAmount} totalPaid={totalPaid} missingAccount={missingAccount} />

      {(planData?.summary?.duplicate_invoice_numbers?.length > 0 ||
        planData?.summary?.existing_invoice_numbers_in_db?.length > 0) && (
        <Alert
          type="warning"
          showIcon
          message="Uyarı"
          description={
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <b>Seçim içinde tekrar eden fatura no:</b>
                <div style={{ maxHeight: 120, overflow: "auto", marginTop: 6 }}>
                  {(planData?.summary?.duplicate_invoice_numbers || []).map((x) => <Tag key={`dup-${x}`}>{x}</Tag>)}
                </div>
              </div>
              <div>
                <b>DB’de zaten bulunan fatura no:</b>
                <div style={{ maxHeight: 120, overflow: "auto", marginTop: 6 }}>
                  {(planData?.summary?.existing_invoice_numbers_in_db || []).map((x) => <Tag key={`db-${x}`} color="purple">{x}</Tag>)}
                </div>
              </div>
            </div>
          }
        />
      )}

      {Array.isArray(planData?.effects?.existing_invoices) && (
        <Card title="DB'de bulunanlar — eklenecek ödeme" style={{ borderColor: "#d9d9d9" }}>
          {planData.effects.existing_invoices.length === 0 ? (
            <div style={{ opacity: .7 }}>Bu seçimde DB'de mevcut fatura yok.</div>
          ) : (
            <List
              size="small"
              dataSource={planData.effects.existing_invoices}
              renderItem={(r) => (
                <List.Item
                  actions={[
                    <span key="delta">
                      {Number(r.delta_payment) > 0
                        ? <>+{Number(r.delta_payment).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ ödeme eklenecek</>
                        : (Number(r.delta_payment) < 0
                          ? <span style={{ color: "#cf1322" }}>
                              {Number(r.delta_payment).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ düzeltme
                            </span>
                          : <>Ödeme eklenmeyecek</>)}
                    </span>,
                    <span key="remain">
                      Proj. kalan: <b>{Number(r.projected_remaining).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</b>
                    </span>,
                    <span key="status">
                      {r.projected_status === "PAID" ? <Tag color="green">Paid</Tag>
                        : r.projected_status === "PARTIAL" ? <Tag color="gold">Partial</Tag>
                        : <Tag>Unpaid</Tag>}
                    </span>,
                  ]}
                >
                  <b>{r.invoice_number}</b>
                  <span style={{ opacity:.7, marginLeft: 8 }}>
                    (Mevcut: {Number(r.existing_paid).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ /
                    Seçilen Toplam Ödenen: {Number(r.selected_total_paid).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺)
                  </span>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      <Row gutter={12}>
        <Col span={12}>
          <Card title="Tedarikçiler">
            <Collapse defaultActiveKey={["new", "existing"]} size="small" ghost>
              <Collapse.Panel header={`Yeni (${planData?.entities?.suppliers?.new?.length || 0})`} key="new">
                <List
                  size="small"
                  dataSource={planData?.entities?.suppliers?.new || []}
                  renderItem={(it) => (
                    <List.Item actions={[<Tag key="c" color="green">{it.count} fatura</Tag>]}>
                      <span><Tag color="green">Yeni</Tag> <b>{it.name}</b></span>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
              <Collapse.Panel header={`Mevcut (${planData?.entities?.suppliers?.existing?.length || 0})`} key="existing">
                <List
                  size="small"
                  dataSource={planData?.entities?.suppliers?.existing || []}
                  renderItem={(it) => (
                    <List.Item actions={[<Tag key="c">{it.count} fatura</Tag>]}>
                      <span><Tag>Mevcut</Tag> <b>{it.name}</b></span>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
            </Collapse>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Hesaplar">
            <Collapse defaultActiveKey={["new", "existing"]} size="small" ghost>
              <Collapse.Panel header={`Yeni (${planData?.entities?.accounts?.new?.length || 0})`} key="new">
                <List
                  size="small"
                  dataSource={planData?.entities?.accounts?.new || []}
                  renderItem={(it) => (
                    <List.Item actions={[<Tag key="c" color="gold">{it.count} fatura</Tag>]}>
                      <span><Tag color="gold">Yeni</Tag> <b>{it.name}</b></span>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
              <Collapse.Panel header={`Mevcut (${planData?.entities?.accounts?.existing?.length || 0})`} key="existing">
                <List
                  size="small"
                  dataSource={planData?.entities?.accounts?.existing || []}
                  renderItem={(it) => (
                    <List.Item actions={[<Tag key="c">{it.count} fatura</Tag>]}>
                      <span><Tag>Mevcut</Tag> <b>{it.name}</b></span>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
            </Collapse>

            {(planData?.issues?.unmapped_accounts?.length > 0) && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message="Eşleşmeyen hesap isimleri"
                description={
                  <div style={{ maxHeight: 120, overflow: "auto" }}>
                    {planData.issues.unmapped_accounts.map((n) => <Tag key={n} color="warning">{n}</Tag>)}
                  </div>
                }
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Card title="Varsayılanlar">
            <Form layout="vertical">
              <Form.Item label="Payment Type ID">
                <InputNumber
                  min={1}
                  value={commitOpts.payment_type_id}
                  onChange={(v) => setCommitOpts((p) => ({ ...p, payment_type_id: Number(v) }))}
                />
              </Form.Item>
              <Form.Item label="Budget Item ID">
                <InputNumber
                  min={1}
                  value={commitOpts.budget_item_id}
                  onChange={(v) => setCommitOpts((p) => ({ ...p, budget_item_id: Number(v) }))}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Seçenekler">
            <Form layout="vertical">
              <Form.Item label="Vergileri güncelle (upsert)">
                <Switch
                  checked={commitOpts.update_taxes_on_upsert}
                  onChange={(v) => setCommitOpts((p) => ({ ...p, update_taxes_on_upsert: v }))}
                />
              </Form.Item>
              <Form.Item label="Negatif düzeltmeye izin ver">
                <Switch
                  checked={commitOpts.allow_negative_adjustment}
                  onChange={(v) => setCommitOpts((p) => ({ ...p, allow_negative_adjustment: v }))}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Özet">
            <div><b>Fatura:</b> {selectedCount} adet</div>
            <div><b>Toplam Tutar:</b> {totalAmount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</div>
            <div><b>Toplam Ödenen:</b> {totalPaid.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</div>
            {missingAccount > 0 && <div style={{ marginTop: 6 }}><b>Eksik Hesap:</b> {missingAccount}</div>}
          </Card>
        </Col>
      </Row>

     <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Button onClick={onBack}>Geri</Button>
        <Button type="primary" loading={commitLoading} onClick={onResolve} disabled={selectedCount === 0}>
          Devam Et
      </Button>
</Space>
    </Space>
  );
}
