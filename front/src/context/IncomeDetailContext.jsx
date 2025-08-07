import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { addReceiptToIncome, deleteIncome, getIncomeById, updateIncome } from '../api/incomeService';
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
    const [isSaving, setIsSaving] = useState(false);

    const openIncomeModal = useCallback(async (incomeId) => {
        try {
            const incomeData = await getIncomeById(incomeId);
            setSelectedIncome(incomeData);
            setIsDetailVisible(true);
        } catch (error) {
            message.error("Gelir detayı getirilirken bir hata oluştu.");
        }
    }, []);

    const closeModal = () => {
        setIsDetailVisible(false);
        setIsEditVisible(false);
        setIsReceiptVisible(false);
        setSelectedIncome(null);
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
            closeModal();
            if (onIncomeUpdate) onIncomeUpdate(null, incomeId); // Silme işlemi için ID gönder
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
        setIsSaving(true);
        try {
            const updatedIncome = await updateIncome(values.id, values);
            message.success("Gelir başarıyla güncellendi.");
            closeModal();
            if (onIncomeUpdate) onIncomeUpdate(updatedIncome);
        } catch (err) {
            message.error("Güncelleme sırasında bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReceiptSubmit = async (receiptData) => {
        setIsSaving(true);
        try {
            const updatedIncome = await addReceiptToIncome(selectedIncome.id, receiptData);
            message.success("Tahsilat başarıyla eklendi.");
            closeModal();
            if (onIncomeUpdate) {
                onIncomeUpdate(updatedIncome); // Güncellenmiş faturayı listeye gönder
            }
        } catch (error) {
            message.error("Tahsilat eklenirken bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <IncomeDetailContext.Provider value={{ openIncomeModal }}>
            {children}
            {selectedIncome && (
                <>
                    <IncomeDetailModal
                        income={selectedIncome}
                        visible={isDetailVisible}
                        onCancel={closeModal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddReceipt={handleAddReceipt}
                    />
                    <Modal title="Geliri Düzenle" open={isEditVisible} onCancel={() => setIsEditVisible(false)} destroyOnClose footer={null}>
                        <IncomeForm onFinish={handleSave} initialValues={selectedIncome} onCancel={() => setIsEditVisible(false)} isSaving={isSaving} />
                    </Modal>
                    <Modal title={`Tahsilat Ekle: ${selectedIncome?.invoice_name}`} open={isReceiptVisible} onCancel={() => setIsReceiptVisible(false)} destroyOnClose footer={null}>
                        <ReceiptForm onFinish={handleReceiptSubmit} onCancel={() => setIsReceiptVisible(false)} income={selectedIncome} isSaving={isSaving} />
                    </Modal>
                </>
            )}
        </IncomeDetailContext.Provider>
    );
};