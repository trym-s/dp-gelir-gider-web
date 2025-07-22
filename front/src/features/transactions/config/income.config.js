import { incomeService } from '../services/transactionService';
import { regionService } from '../../../api/regionService';
import { companyService } from '../../../api/companyService';
import { accountNameService } from '../../../api/accountNameService';
import { budgetItemService } from '../../../api/budgetItemService';

export const incomeConfig = {
  entity: 'income',
  title: 'Gelirler',
  service: incomeService,
  statusMap: {
    'RECEIVED': { color: 'green', text: 'Alındı' },
    'UNRECEIVED': { color: 'red', text: 'Alınmadı' },
    'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Alındı' },
    'OVER_RECEIVED': { color: 'purple', text: 'Fazla Alındı' },
  },
  rowClassName: (record) => {
    switch (record.status) {
        case 'RECEIVED': return 'row-is-complete';
        case 'PARTIALLY_RECEIVED': return 'row-is-partial';
        case 'UNRECEIVED': return 'row-is-danger';
        default: return '';
    }
  },
  list: {
    columns: [
        { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
        { title: "Firma", dataIndex: ["company", "name"], key: "company" },
        { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
        { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
        { title: "Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', render: (val) => `${val} ₺` },
    ],
    filters: [
        { id: 'region_id', label: 'Bölge', service: regionService.getAll },
        { id: 'company_id', label: 'Firma', service: companyService.getAll },
        { id: 'account_name_id', label: 'Hesap Adı', service: accountNameService.getAll },
        { id: 'budget_item_id', label: 'Bütçe Kalemi', service: budgetItemService.getAll },
    ]
  },
  form: {
    amountField: 'total_amount',
    dateLabel: 'Tahsilat Tarihi',
    fields: [
      {
        name: 'region_id',
        label: 'Bölge',
        type: 'select',
        service: regionService,
        parent: null,
        child: null, // No direct child in this form structure
      },
      {
        name: 'company_id',
        label: 'Firma',
        type: 'select',
        service: companyService,
        parent: null, 
        child: 'account_name_id',
      },
      {
        name: 'account_name_id',
        label: 'Hesap Adı',
        type: 'select',
        service: accountNameService,
        parent: 'company_id',
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
      hue: 120, // Green
      saturation: 100,
    },
    columns: [
        { title: "Firma", dataIndex: "company_name", key: "company_name", width: 180 },
    ],
    getChildRowData: (item) => ({
        company_name: item.company_name,
    })
  }
};
