import { expenseService } from '../services/transactionService';
import { regionService } from '../../../api/regionService';
import { paymentTypeService } from '../../../api/paymentTypeService';
import { accountNameService } from '../../../api/accountNameService';
import { budgetItemService } from '../../../api/budgetItemService';

export const expenseConfig = {
  entity: 'expense',
  title: 'Giderler',
  service: expenseService,
  statusMap: {
    'PAID': { color: 'green', text: 'Ödendi' },
    'UNPAID': { color: 'red', text: 'Ödenmedi' },
    'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
    'OVERPAID': { color: 'purple', text: 'Fazla Ödendi' },
  },
  rowClassName: (record) => {
    switch (record.status) {
        case 'PAID': return 'row-is-complete';
        case 'PARTIALLY_PAID': return 'row-is-partial';
        case 'UNPAID': return 'row-is-danger';
        default: return '';
    }
  },
  list: {
    columns: [
      { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
      { title: "Ödeme Türü", dataIndex: ["payment_type", "name"], key: "payment_type" },
      { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
      { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
      { title: "Tutar", dataIndex: "amount", key: "amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
      { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', render: (val) => `${val} ₺` },
    ],
    filters: [
        { id: 'region_id', label: 'Bölge', service: regionService.getAll },
        { id: 'payment_type_id', label: 'Ödeme Türü', service: paymentTypeService.getAll },
        { id: 'account_name_id', label: 'Hesap Adı', service: accountNameService.getAll },
        { id: 'budget_item_id', label: 'Bütçe Kalemi', service: budgetItemService.getAll },
    ]
  },
  form: {
    amountField: 'amount',
    dateLabel: 'Son Ödeme Tarihi',
    fields: [
      {
        name: 'region_id',
        label: 'Bölge',
        type: 'select',
        service: regionService,
        parent: null,
        child: 'payment_type_id',
      },
      {
        name: 'payment_type_id',
        label: 'Ödeme Türü',
        type: 'select',
        service: paymentTypeService,
        parent: 'region_id',
        child: 'account_name_id',
      },
      {
        name: 'account_name_id',
        label: 'Hesap Adı',
        type: 'select',
        service: accountNameService,
        parent: 'payment_type_id',
        child: 'budget_item_id',
      },
      {
        name: 'budget_item_id',
        label: 'Bütçe Kalemi',
        type: 'select',
        service: budgetItemService,
        parent: 'account_name_id',
        child: null,
      },
    ],
  },
  pivot: {
    heatmapColor: {
      hue: 0, // Red
      saturation: 100,
    },
    columns: [
        { title: "Konum", dataIndex: "region_name", key: "region_name", width: 180 },
        { title: "Hesap Adı", dataIndex: "account_name", key: "account_name", width: 180 },
    ],
    getChildRowData: (item) => ({
        region_name: item.region_name,
        account_name: item.account_name,
    })
  }
};
