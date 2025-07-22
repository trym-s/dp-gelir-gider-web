import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import TransactionDetailModal from '../components/TransactionDetailModal';
import TransactionForm from '../components/TransactionForm';
import RelatedTransactionForm from '../components/RelatedTransactionForm';

const TransactionDetailContext = createContext();

export const useTransactionDetail = () => useContext(TransactionDetailContext);

export const TransactionDetailProvider = ({ children, config, onUpdate }) => {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isEditVisible, setIsEditVisible] = useState(false);
    const [isPaymentVisible, setIsPaymentVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { service, title } = config;
    const entityName = title.slice(0, -1);
    const relatedEntityName = config.entity === 'expense' ? 'Ödeme' : 'Tahsilat';

    const openModal = useCallback(async (transactionId) => {
        setIsLoading(true);
        try {
            const data = await service.getById(transactionId);
            setSelectedTransaction(data);
            setIsDetailVisible(true);
        } catch (error) {
            message.error(`${entityName} detayı getirilirken bir hata oluştu.`);
        } finally {
            setIsLoading(false);
        }
    }, [service, entityName]);

    const closeModalAndRefresh = (shouldRefresh = false) => {
        setIsDetailVisible(false);
        setIsEditVisible(false);
        setIsPaymentVisible(false);
        setSelectedTransaction(null);
        if (shouldRefresh && onUpdate) {
            onUpdate();
        }
    };

    const handleEdit = (transaction) => {
        setIsDetailVisible(false);
        setSelectedTransaction(transaction);
        setIsEditVisible(true);
    };

    const handleDelete = async (transactionId) => {
        try {
            await service.remove(transactionId);
            message.success(`${entityName} başarıyla silindi.`);
            closeModalAndRefresh(true);
        } catch (error) {
            message.error(`${entityName} silinirken bir hata oluştu.`);
        }
    };

    const handleAddRelatedTransaction = (transaction) => {
        setIsDetailVisible(false);
        setSelectedTransaction(transaction);
        setIsPaymentVisible(true);
    };

    const handleSave = async (values, isGroup) => {
        setIsSaving(true);
        const serviceToCall = isGroup ? service.createGroup : (values.id ? service.update : service.create);
        const id = isGroup ? undefined : values.id;
        
        try {
            if (id) {
                await serviceToCall(id, values);
            } else {
                await serviceToCall(values);
            }
            message.success(`${entityName} başarıyla kaydedildi.`);
            closeModalAndRefresh(true);
        } catch (err) {
            message.error("Kaydetme sırasında bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRelatedTransactionSubmit = async (paymentData) => {
        setIsSaving(true);
        try {
            await service.addRelatedTransaction(selectedTransaction.id, paymentData);
            message.success(`${relatedEntityName} başarıyla eklendi.`);
            closeModalAndRefresh(true);
        } catch (error) {
            message.error(`${relatedEntityName} eklenirken bir hata oluştu.`);
        } finally {
            setIsSaving(false);
        }
    };

    const value = { openModal, handleSave };

    return (
        <TransactionDetailContext.Provider value={value}>
            {children}
            {selectedTransaction && (
                <>
                    <TransactionDetailModal
                        transaction={selectedTransaction}
                        visible={isDetailVisible}
                        onCancel={() => closeModalAndRefresh(false)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddPayment={handleAddRelatedTransaction}
                        config={config}
                    />
                    <Modal
                        title={`${entityName} Düzenle`}
                        open={isEditVisible}
                        onCancel={() => closeModalAndRefresh(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <TransactionForm 
                            onFinish={handleSave} 
                            initialValues={selectedTransaction} 
                            onCancel={() => closeModalAndRefresh(false)} 
                            config={config}
                            isSaving={isSaving}
                        />
                    </Modal>
                    
                    <Modal
                        title={`${relatedEntityName} Ekle: ${selectedTransaction?.description}`}
                        open={isPaymentVisible}
                        onCancel={() => closeModalAndRefresh(false)}
                        destroyOnClose
                        footer={null}
                    >
                        <RelatedTransactionForm 
                            onFinish={handleRelatedTransactionSubmit} 
                            onCancel={() => closeModalAndRefresh(false)}
                            parentTransaction={selectedTransaction}
                            config={config}
                            isSaving={isSaving}
                        />
                    </Modal>
                </>
            )}
        </TransactionDetailContext.Provider>
    );
};
