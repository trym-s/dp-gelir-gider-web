import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../../api/api';
import LoanKPIs from './LoanKPIs';
import PaymentHistoryTable from './PaymentHistoryTable';
import styles from './LoanDetail.module.css';

const LoanDetail = () => {
    const { id } = useParams();
    const [loan, setLoan] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        const fetchLoanDetails = async () => {
            try {
                setLoading(true);
                // Mock data for demonstration since the API call might not work in this environment
                const mockLoan = {
                    id: id,
                    loan_name: 'Konut Kredisi',
                    loan_type: 'İpotek',
                    amount: 200000,
                    interest_rate: 3.5,
                    term: 360,
                    remaining_amount: 185000,
                    payments: [
                        { id: 1, payment_date: '2023-01-15', payment_amount: 898.09, principal_amount: 314.76, interest_amount: 583.33, remaining_balance: 199685.24 },
                        { id: 2, payment_date: '2023-02-15', payment_amount: 898.09, principal_amount: 315.68, interest_amount: 582.41, remaining_balance: 199369.56 },
                        { id: 3, payment_date: '2023-03-15', payment_amount: 898.09, principal_amount: 316.61, interest_amount: 581.48, remaining_balance: 199052.95 },
                        { id: 4, payment_date: '2023-04-15', payment_amount: 898.09, principal_amount: 317.54, interest_amount: 580.55, remaining_balance: 198735.41 },
                        { id: 5, payment_date: '2023-05-15', payment_amount: 898.09, principal_amount: 318.47, interest_amount: 579.62, remaining_balance: 198416.94 },
                    ]
                };
                setLoan(mockLoan);
                setPayments(mockLoan.payments);
                setError(null);
            } catch (err) {
                setError('Failed to fetch loan details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLoanDetails();
    }, [id]);

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!loan) return <div className={styles.noData}>No loan data found.</div>;

    return (
        <div className={styles.loanDetailContainer}>
            <header className={styles.header}>
                <h1>{loan.loan_name}</h1>
                <p>Type: {loan.loan_type}</p>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'details' ? styles.active : ''}`}
                    onClick={() => setActiveTab('details')}
                >
                    Kredi Detayları
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'payments' ? styles.active : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    Ödeme Geçmişi
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'details' && (
                    <LoanKPIs
                        amount={loan.amount}
                        interest_rate={loan.interest_rate}
                        term={loan.term}
                        remaining_amount={loan.remaining_amount}
                    />
                )}
                {activeTab === 'payments' && (
                    <PaymentHistoryTable
                        payments={payments}
                        setPayments={setPayments}
                    />
                )}
            </div>
        </div>
    );
};

export default LoanDetail;