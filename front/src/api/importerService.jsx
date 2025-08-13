// importerService.js
import { api } from './api';

export const parseFileOnServer = async (formData) => {
  console.log("🚀 [importerService] sending FormData");
  for (let [key, value] of formData.entries()) console.log(`  -> ${key}:`, value);
  try {
    const response = await api.post('/importer/file-parser', formData);
    console.log("✅ [importerService] parsed:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [importerService] parse error:", error.response?.data || error.message);
    throw error;
  }
};

function normError(err) {
  if (err.response) {
    const { status, data } = err.response;
    return new Error(data?.error || data?.message || `Request failed (${status})`);
  }
  if (err.request) return new Error("No response from server");
  return new Error(err.message || "Unexpected error");
}

// BASE = "/api/import/expense" axios instance'da baseURL="/api" ise bu path'ler doğru.
export async function uploadExpensePreview(file, opts = {}) {
  try {
    const form = new FormData();
    form.append("file", file);
    if (opts.sheet !== undefined && opts.sheet !== null) {
      form.append("sheet", String(opts.sheet));
    }
    // Header'ı ELLE set etme; axios boundary'yi kendisi ekler.
    const res = await api.post("/import/expense/preview", form, {
      signal: opts.cancelSignal,
    });
    return res.data;
  } catch (err) {
    throw normError(err);
  }
}

export async function getExpensePreview(previewId, opts = {}) {
  try {
    const { page = 1, size = 50, cancelSignal } = opts;
    const res = await api.get(`/import/expense/preview/${previewId}`, {
      params: { page, size },
      signal: cancelSignal,
    });
    return res.data;
  } catch (err) {
    throw normError(err);
  }
}

// !! options parametresini al ve gönder
export async function planExpenseImport(previewId, indices, defaults = {}, options = {}, opts = {}) {
  try {
    const payload = {
      preview_id: previewId,
      indices: indices || [],
      defaults,
      options, // <-- eklendi
    };
    const res = await api.post("/import/expense/plan", payload, { signal: opts.cancelSignal });
    return res.data;
  } catch (err) {
    throw normError(err);
  }
}

// URL yanlış ve fetch kullanımı gereksizdi → axios'a çekip doğru route'a al
export async function commitExpenseImport(previewId, indices, options = {}, { cancelSignal } = {}, overrides = []) {
  try {
    const payload = {
      preview_id: previewId,
      indices: indices || [],
      options,
      overrides,
    };
    const res = await api.post("/import/expense/commit", payload, { signal: cancelSignal });
    return res.data;
  } catch (err) {
    throw normError(err);
  }
}

export function makeAbort() {
  const controller = new AbortController();
  return { controller, signal: controller.signal };
}

