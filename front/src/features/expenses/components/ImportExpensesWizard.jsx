
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Steps, Divider, message } from "antd";
import { uploadExpensePreview, getExpensePreview, commitExpenseImport, makeAbort } from "../../../api/importerService";
import UploadStep from "./steps/UploadStep";
import PreviewStep from "./steps/PreviewStep";
import ResolveStep from "./steps/ResolveStep";
import DoneStep from "./steps/DoneStep";
import { normalizeExpenseItem } from "./utils";

export default function ImportExpensesWizard({ open, onClose, onCommitted }) {
  const [step, setStep] = useState(0);

  // upload
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(0);

  // preview
  const [previewId, setPreviewId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSize, setPreviewSize] = useState(50);
  const [preview, setPreview] = useState({ items: [], total: 0 });
  const [globalIndexBase, setGlobalIndexBase] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // commit
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitOpts, setCommitOpts] = useState({
    region_id: 1,
    payment_type_id: 1,
    budget_item_id: 1,
    update_taxes_on_upsert: false,
    allow_negative_adjustment: false,
  });
  const [commitResult, setCommitResult] = useState(null);
  const [lastCommitErrors, setLastCommitErrors] = useState([]);
  const [pendingOverrides, setPendingOverrides] = useState([]);

  // abort inflight
  const inflight = useRef([]);
  useEffect(() => () => inflight.current.forEach((c) => c.controller.abort()), []);

  // reset on close
  useEffect(() => {
    if (!open) {
      setStep(0);
      setFile(null);
      setSheet(0);
      setPreviewId(null);
      setPreview({ items: [], total: 0 });
      setPreviewPage(1);
      setPreviewSize(50);
      setGlobalIndexBase(0);
      setSelectedRowKeys([]);
      setSearch("");
      setCommitLoading(false);
      setCommitOpts({
        region_id: 1,
        payment_type_id: 1,
        budget_item_id: 1,
        update_taxes_on_upsert: false,
        allow_negative_adjustment: false,
      });
      setCommitResult(null);
      setLastCommitErrors([]);
      setPendingOverrides([]);
    }
  }, [open]);

  // ---- actions ----
  const handleUpload = async () => {
    if (!file) return message.warning("Bir dosya seç.");
    try {
      const { controller, signal } = makeAbort();
      inflight.current.push({ controller });
      const res = await uploadExpensePreview(file, { sheet, cancelSignal: signal });
      setPreviewId(res.preview_id);
      message.success(`Önizleme hazır: ${res.count} satır`);
      setStep(1);
      await fetchPreview(res.preview_id, 1, previewSize);
    } catch (e) {
      message.error(e.message || "Önizleme alınamadı");
    }
  };

  const fetchPreview = async (pid = previewId, page = previewPage, size = previewSize) => {
    if (!pid) return;
    setPreviewLoading(true);
    try {
      const { controller, signal } = makeAbort();
      inflight.current.push({ controller });
      const data = await getExpensePreview(pid, { page, size, cancelSignal: signal });
      const items = (data.items || []).map(normalizeExpenseItem);
      setPreview({ items, total: data.total });
      setPreviewPage(page);
      setPreviewSize(size);
      setGlobalIndexBase((page - 1) * size);
    } catch (e) {
      message.error(e.message || "Önizleme yüklenemedi");
    } finally {
      setPreviewLoading(false);
    }
  };

  const goReview = () => {
    if (!previewId || selectedRowKeys.length === 0) {
      return message.warning("Devam etmek için satır seç.");
    }
    setStep(2);
  };

  const handleCommit = async (overrides = pendingOverrides) => {
    if (!previewId || selectedRowKeys.length === 0) return message.warning("Kaydetmek için satır seç.");
    setCommitLoading(true);
    try {
      const { controller, signal } = makeAbort();
      inflight.current.push({ controller });
      const res = await commitExpenseImport(previewId, selectedRowKeys, { ...commitOpts }, { cancelSignal: signal }, overrides);
      setCommitResult(res);
      setLastCommitErrors(Array.isArray(res?.errors) ? res.errors : []);
      if (Array.isArray(res?.errors) && res.errors.length > 0) {
        message.warning("Bazı satırlar işlenemedi. Düzelt ve tekrar dene.");
      } else {
        message.success("İçe aktarma tamamlandı");
        onCommitted && onCommitted();
      }
      setStep(3);
    } catch (e) {
      message.error(e.message || "Kayıt başarısız");
    } finally {
      setCommitLoading(false);
    }
  };

  // ---- derived ----
  const filteredItems = useMemo(() => {
    if (!search) return preview.items;
    const s = search.toLowerCase();
    return preview.items.filter(
      (r) =>
        (r.invoice_number || "").toLowerCase().includes(s) ||
        (r.invoice_name || "").toLowerCase().includes(s) ||
        (r.supplier || "").toLowerCase().includes(s)
    );
  }, [preview.items, search]);

  const selectedRows = useMemo(() => {
    const map = new Set(selectedRowKeys);
    return filteredItems.filter((_, idx) => map.has(globalIndexBase + idx));
  }, [filteredItems, selectedRowKeys, globalIndexBase]);

  const selectedTotalAmount = useMemo(() => selectedRows.reduce((a, r) => a + Number(r.amount || 0), 0), [selectedRows]);
  const selectedTotalPaid   = useMemo(() => selectedRows.reduce((a, r) => a + Number(r.total_paid || 0), 0), [selectedRows]);

  return (
    <Modal title="Gider İçe Aktarma" open={open} onCancel={onClose} width={1100} footer={null} destroyOnClose>
      <Steps
        current={step}
        items={[
          { title: "Yükle" },
          { title: "Önizle & Seç" },
          { title: "İncele & Kaydet" },
          { title: "Bitti" },
        ]}
      />
      <Divider />

      {step === 0 && (
        <UploadStep
          file={file}
          setFile={setFile}
          sheet={sheet}
          setSheet={setSheet}
          onCancel={onClose}
          onUpload={handleUpload}
        />
      )}

      {step === 1 && (
        <PreviewStep
          previewId={previewId}
          items={filteredItems}
          total={preview.total}
          loading={previewLoading}
          page={previewPage}
          size={previewSize}
          onPageChange={(p, s) => fetchPreview(previewId, p, s)}
          onRefresh={() => fetchPreview()}
          selectedRowKeys={selectedRowKeys}
          setSelectedRowKeys={setSelectedRowKeys}
          globalIndexBase={globalIndexBase}
          search={search}
          setSearch={setSearch}
          selectedTotalAmount={selectedTotalAmount}
          selectedTotalPaid={selectedTotalPaid}
          onBack={() => setStep(0)}
          onNext={goReview}
          planLoading={false}
        />
      )}

      {step === 2 && (
        <ResolveStep
          defaultPtid={commitOpts.payment_type_id}
          selectedRows={selectedRows}
          commitLoading={commitLoading}
          lastCommitErrors={lastCommitErrors}
          onBack={() => setStep(1)}
          onCommitWithOverrides={(ov) => { setPendingOverrides(ov); handleCommit(ov); }}
        />
      )}

      {step === 3 && (
        <DoneStep
          commitResult={commitResult}
          onClose={onClose}
          onFix={(errors) => { setLastCommitErrors(errors || []); setStep(2); }}
        />
      )}
    </Modal>
  );
}

