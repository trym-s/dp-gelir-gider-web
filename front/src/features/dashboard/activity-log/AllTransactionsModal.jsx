import React from 'react';
import { Modal, Tabs } from 'antd';
import { MoneyCollectOutlined, LoginOutlined } from '@ant-design/icons';
import IncomeExpenseTab from './IncomeExpenseTab'; // Sonraki adımda oluşturacağız
import DailyEntriesTab from './DailyEntriesTab';
import '../styles/AllTransactionsModal.css';

const { TabPane } = Tabs;

const AllTransactionsModal = ({ visible, onClose }) => {
  return (
    <Modal
      title="Tüm İşlemler ve Kayıtlar"
      visible={visible}
      onCancel={onClose}
      footer={null} // Kendi altbilgimizi veya hiç kullanmayabiliriz
      width="90%"
      style={{ top: 20 }}
      destroyOnClose // Modal kapandığında içindeki state'leri sıfırla
    >
      <Tabs defaultActiveKey="1">
        <TabPane
          tab={
            <span>
              <MoneyCollectOutlined />
              Gelir & Gider İşlemleri
            </span>
          }
          key="1"
        >
          <IncomeExpenseTab />
        </TabPane>
        <TabPane
          tab={
            <span>
              <LoginOutlined />
              Giriş Kayıtları
            </span>
          }
          key="2"
        >
          <DailyEntriesTab /> 
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AllTransactionsModal;