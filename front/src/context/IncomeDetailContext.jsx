import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
// TODO: Create and import from '../api/incomeService';
// import { getIncomeById, updateIncome, deleteIncome, addReceiptToIncome } from '../api/incomeService';
import IncomeDetailModal from '../features/incomes/components/IncomeDetailModal';
// TODO: Create an IncomeForm component
// import IncomeForm from '../features/incomes/components/IncomeForm';
// TODO: Create a ReceiptForm component
// import ReceiptForm from '../features/incomes/components/ReceiptForm';

const IncomeDetailContext = createContext();

export const useIncomeDetail = () => useContext(IncomeDetailContext);

// Mock functions for non-existent services
const getIncomeById = async (id) => { console.log(`Fetching income ${id}`); return { id, description: 'Sample Income', amount: 1000, received_amount: 500, status: 'UNRECEIVED', date: '2025-07-15' }; };
const updateIncome = async (id, data) => { console.log(`Updating income ${id}`, data); };
const deleteIncome = async (id) => { console.log(`Deleting income ${id}`); };
const addReceiptToIncome = async (id, data) => { console.log(`Adding receipt to income ${id}`, data); };


export const IncomeDetailProvider = ({ children, onIncomeUpdate }) => {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isEditVisible, setIsEditVisible] = useState(false);
    const [isReceiptVisible, setIsReceiptVisible] = useState(false);
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const openIncomeModal = useCallback((incomeId) => {
        // DEBUG: API çağrısını atlayarak modal görünürlüğünü test et
        console.log(`Modal açılıyor (Income ID: ${incomeId})`);
        const mockIncome = {
            id: incomeId,
            description: 'Test Geliri - API Devre Dışı',
            amount: 2000,
            received_amount: 1000,
            status: 'UNRECEIVED',
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            region: { name: 'Test Bölge' },
            account_name: { name: 'Test Hesap' },
            budget_item: { name: 'Test Bütçe Kalemi' },
        };
        setSelectedIncome(mockIncome);
        setIsDetailVisible(true);
    }, []);

    const closeModalAndRefresh = () => {
        setIsDetailVisible(false);
        setIsEditVisible(false);
        setIsReceiptVisible(false);
        setSelectedIncome(null);
        if (onIncomeUpdate) {
            onIncomeUpdate();
        }
    };

    const handleEdit = (income) => {
        setIsDetailVisible(false);
        setSelectedIncome(income);
        setIsEditVisible(true);
    };

    const handleDelete = async (incomeId) => {
        try {
            await deleteIncome(incomeId);
            message.success("Gelir başarıyla silindi.");
            closeModalAndRefresh();
        } catch (error) {
            message.error("Gelir silinirken bir hata oluştu.");
        }
    };

    const handleAddReceipt = (income) => {
        setIsDetailVisible(false);
        setSelectedIncome(income);
        setIsReceiptVisible(true);
    };

    const handleSave = async (values) => {
        try {
            await updateIncome(values.id, values);
            message.success("Gelir başarıyla güncellendi.");
            closeModalAndRefresh();
        } catch (err) {
            message.error("Güncelleme sırasında bir hata oluştu.");
        }
    };

    const handleReceiptSubmit = async (receiptData) => {
        try {
            await addReceiptToIncome(selectedIncome.id, receiptData);
            message.success("Tahsilat başarıyla eklendi.");
            closeModalAndRefresh();
        } catch (error) {
            message.error("Tahsilat eklenirken bir hata oluştu.");
        }
    };

    const value = { openIncomeModal };

    return (
        <IncomeDetailContext.Provider value={value}>
            {children}
            {selectedIncome && (
                <>
                    <IncomeDetailModal
                        income={selectedIncome}
                        visible={isDetailVisible}
                        onCancel={() => setIsDetailVisible(false)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddReceipt={handleAddReceipt}
                    />
                    {/* TODO: Replace with actual IncomeForm and ReceiptForm modals */}
                    <Modal
                        title="Geliri Düzenle"
                        open={isEditVisible}
                        onCancel={() => setIsEditVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        {/* <IncomeForm onFinish={handleSave} initialValues={selectedIncome} onCancel={() => setIsEditVisible(false)} /> */}
                        <p>Income Form Placeholder</p>
                    </Modal>
                    <Modal
                        title={`Tahsilat Ekle: ${selectedIncome?.description}`}
                        open={isReceiptVisible}
                        onCancel={() => setIsReceiptVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        {/* <ReceiptForm 
                            onFinish={handleReceiptSubmit} 
                            onCancel={() => setIsReceiptVisible(false)}
                            income={selectedIncome}
                        /> */}
                        <p>Receipt Form Placeholder</p>
                    </Modal>
                </>
            )}
        </IncomeDetailContext.Provider>
    );
};
