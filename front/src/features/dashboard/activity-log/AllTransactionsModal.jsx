import React from 'react';
import { Modal, Tabs } from 'antd';
import { MoneyCollectOutlined, LoginOutlined, HistoryOutlined } from '@ant-design/icons';
import IncomeExpenseTab from './IncomeExpenseTab';
import DailyEntriesTab from './DailyEntriesTab';
import ActivityLogTab from './ActivityLogTab'; // YENİ BİLEŞENİ İMPORT ET
import '../styles/AllTransactionsModal.css';

const { TabPane } = Tabs;

const AllTransactionsModal = ({ visible, onClose }) => {
  return (
    <Modal
      title="Tüm İşlemler ve Kayıtlar"
      open={visible} // Antd v5 için 'visible' yerine 'open'
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
      destroyOnClose
    >
      <Tabs defaultActiveKey="1">
        <TabPane
          tab={<span><MoneyCollectOutlined />Gelir & Gider İşlemleri</span>}
          key="1"
        >
          {/* Bu sekme artık eski, sadece finansal işlemleri gösteren haline dönecek */}
          <IncomeExpenseTab />
        </TabPane>
        
        {/* YENİ SEKME */}
        <TabPane
          tab={<span><HistoryOutlined />Sistem Olayları</span>}
          key="3" 
        >
          <ActivityLogTab />
        </TabPane>

        <TabPane
          tab={<span><LoginOutlined />Giriş Kayıtları</span>}
          key="2"
        >
          <DailyEntriesTab /> 
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AllTransactionsModal;