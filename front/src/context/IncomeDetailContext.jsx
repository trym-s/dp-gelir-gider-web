import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { getIncomeById, updateIncome, deleteIncome, addReceiptToIncome } from '../api/incomeService';
import IncomeDetailModal from '../features/incomes/components/IncomeDetailModal';
import IncomeForm from '../features/incomes/components/IncomeForm';
import ReceiptForm from '../features/incomes/components/ReceiptForm';

const IncomeDetailContext = createContext();

export const useIncomeDetail = () => useContext(IncomeDetailContext);

export const IncomeDetailProvider = ({ children, onIncomeUpdate }) => {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isEditVisible, setIsEditVisible] = useState(false);
    const [isReceiptVisible, setIsReceiptVisible] = useState(false);
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [onBackCallback, setOnBackCallback] = useState(null);

    const openIncomeModal = useCallback(async (incomeId, onBack) => {
        setIsLoading(true);
        if (onBack) {
            setOnBackCallback(() => onBack);
        }
        try {
            const incomeData = await getIncomeById(incomeId);
            setSelectedIncome(incomeData);
            setIsDetailVisible(true);
        } catch (error) {
            message.error("Gelir detayı getirilirken bir hata oluştu.");
            if (onBack) {
                onBack();
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const closeModalAndRefresh = (fromBack = false) => {
        setIsDetailVisible(false);
        setIsEditVisible(false);
        setIsReceiptVisible(false);
        setSelectedIncome(null);

        if (fromBack && onBackCallback) {
            onBackCallback();
        } else if (onIncomeUpdate) {
            onIncomeUpdate(); // Trigger the refresh
        }
        setOnBackCallback(null);
    };

    const handleBack = () => {
        closeModalAndRefresh(true);
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
                        onCancel={() => closeModalAndRefresh(false)}
                        onBack={onBackCallback ? handleBack : null}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddReceipt={handleAddReceipt}
                    />
                    <Modal
                        title="Geliri Düzenle"
                        open={isEditVisible}
                        onCancel={() => setIsEditVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <IncomeForm onFinish={handleSave} initialValues={selectedIncome} onCancel={() => setIsEditVisible(false)} />
                    </Modal>
                    <Modal
                        title={`Tahsilat Ekle: ${selectedIncome?.description}`}
                        open={isReceiptVisible}
                        onCancel={() => setIsReceiptVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <ReceiptForm 
                            onFinish={handleReceiptSubmit} 
                            onCancel={() => setIsReceiptVisible(false)}
                            income={selectedIncome}
                        />
                    </Modal>
                </>
            )}
        </IncomeDetailContext.Provider>
    );
};
