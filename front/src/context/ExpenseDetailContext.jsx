import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { getExpenseById, updateExpense, deleteExpense, addPaymentToExpense } from '../api/expenseService';
import ExpenseDetailModal from '../features/expenses/components/ExpenseDetailModal';
import ExpenseForm from '../features/expenses/components/ExpenseForm';
import PaymentForm from '../features/expenses/components/PaymentForm';

const ExpenseDetailContext = createContext();

export const useExpenseDetail = () => useContext(ExpenseDetailContext);

export const ExpenseDetailProvider = ({ children, onExpenseUpdate }) => {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isEditVisible, setIsEditVisible] = useState(false);
    const [isPaymentVisible, setIsPaymentVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [onBackCallback, setOnBackCallback] = useState(null);

    const openExpenseModal = useCallback(async (expenseId, onBack) => {
        setIsLoading(true);
        if (onBack) {
            setOnBackCallback(() => onBack);
        }
        try {
            const expenseData = await getExpenseById(expenseId);
            setSelectedExpense(expenseData);
            setIsDetailVisible(true);
        } catch (error) {
            message.error("Gider detayı getirilirken bir hata oluştu.");
            // If opening fails, invoke the onBack callback to show the previous modal
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
        setIsPaymentVisible(false);
        setSelectedExpense(null);
        
        if (fromBack && onBackCallback) {
            onBackCallback();
        } else if (onExpenseUpdate) {
            onExpenseUpdate();
        }
        setOnBackCallback(null);
    };

    const handleBack = () => {
        closeModalAndRefresh(true);
    };

    const handleEdit = (expense) => {
        setIsDetailVisible(false);
        setSelectedExpense(expense);
        setIsEditVisible(true);
    };

    const handleDelete = async (expenseId) => {
        try {
            await deleteExpense(expenseId);
            message.success("Gider başarıyla silindi.");
            closeModalAndRefresh();
        } catch (error) {
            message.error("Gider silinirken bir hata oluştu.");
        }
    };

    const handleAddPayment = (expense) => {
        setIsDetailVisible(false);
        setSelectedExpense(expense);
        setIsPaymentVisible(true);
    };

    const handleSave = async (values) => {
        if (!selectedExpense || !selectedExpense.id) {
            message.error("Güncellenecek gider bulunamadı.");
            return;
        }
        try {
            await updateExpense(selectedExpense.id, values);
            message.success("Gider başarıyla güncellendi.");
            closeModalAndRefresh();
        } catch (err) {
            message.error("Güncelleme sırasında bir hata oluştu.");
        }
    };

    const handlePaymentSubmit = async (paymentData) => {
        try {
            await addPaymentToExpense(selectedExpense.id, paymentData);
            message.success("Ödeme başarıyla eklendi.");
            closeModalAndRefresh();
        } catch (error) {
            message.error("Ödeme eklenirken bir hata oluştu.");
        }
    };

    const value = { openExpenseModal };

    return (
        <ExpenseDetailContext.Provider value={value}>
            {children}
            {selectedExpense && (
                <>
                    <ExpenseDetailModal
                        expense={selectedExpense}
                        visible={isDetailVisible}
                        onCancel={() => closeModalAndRefresh(false)}
                        onBack={onBackCallback ? handleBack : null}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddPayment={handleAddPayment}
                    />
                    <Modal
                        title="Gideri Düzenle"
                        open={isEditVisible}
                        onCancel={() => setIsEditVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <ExpenseForm onFinish={handleSave} initialValues={selectedExpense} onCancel={() => setIsEditVisible(false)} />
                    </Modal>
                    <Modal
                        title={`Ödeme Ekle: ${selectedExpense?.description}`}
                        open={isPaymentVisible}
                        onCancel={() => setIsPaymentVisible(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <PaymentForm 
                            onFinish={handlePaymentSubmit} 
                            onCancel={() => setIsPaymentVisible(false)}
                            expense={selectedExpense}
                        />
                    </Modal>
                </>
            )}
        </ExpenseDetailContext.Provider>
    );
};
