// /front/src/features/credits/bank-logs/components/BankCard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSave, FiLoader, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { api } from '../api';
import { EditableTotal } from './EditableTotal';
import { Tooltip, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import './BankCard.css';

// --- Stil Nesneleri ---
const cardStyles = {
  container: {
    backgroundColor: 'var(--background-color-white)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: '0 2px 4px var(--shadow-color-05)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) 180px 1fr 1fr 1fr auto',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid transparent', // Use transparent border to prevent layout shifts
  },
  containerHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px var(--shadow-color-10)',
    borderColor: 'var(--primary-color)', // Highlight with primary color on hover
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '5px',
    backgroundColor: 'var(--success-color)',
    transition: 'opacity 0.2s ease-in-out',
  },
  bankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    minWidth: 0,
  },
  logo: {
    width: 'auto',
    height: '20px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  bankName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-color-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  totalHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--primary-color-20)',
    borderRadius: 'var(--border-radius-base)',
    justifySelf: 'center',
  },
  totalHighlightLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--primary-color-dark)',
  },
  totalHighlightValue: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--primary-color)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    justifyContent: 'flex-end',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--spacing-xs)',
    color: 'var(--text-color-secondary)',
    transition: 'color 0.2s ease-in-out',
  },
  saveButton: {
    color: 'var(--success-color)',
  },
  saveButtonDisabled: {
    color: 'var(--text-color-light)',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--white-color-85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 'var(--border-radius-lg)',
    zIndex: 10,
  },
};

// --- Bileşen ---
export function BankCard({ balanceData, period, date, isPersisted }) {
  const [isCardEditing, setIsCardEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [formState, setFormState] = useState({
    try: balanceData.try || 0,
    usd: balanceData.usd || 0,
    eur: balanceData.eur || 0,
  });

  const tryInputRef = useRef(null);
  const cardRef = useRef(null);
  const queryClient = useQueryClient();

  const isDirty = JSON.stringify(formState) !== JSON.stringify({
    try: balanceData.try || 0,
    usd: balanceData.usd || 0,
    eur: balanceData.eur || 0,
  });

  const handleCancel = useCallback(() => {
    setFormState({
      try: balanceData.try || 0,
      usd: balanceData.usd || 0,
      eur: balanceData.eur || 0,
    });
    setIsCardEditing(false);
  }, [balanceData]);

  useEffect(() => {
    setFormState({
      try: balanceData.try || 0,
      usd: balanceData.usd || 0,
      eur: balanceData.eur || 0,
    });
    setIsCardEditing(false);
  }, [balanceData]);

  useEffect(() => {
    if (isCardEditing) {
      tryInputRef.current?.focus();
    }
  }, [isCardEditing]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };
    if (isCardEditing) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isCardEditing, handleCancel]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        handleCancel();
      }
    };

    if (isCardEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCardEditing, handleCancel]);

  const mutation = useMutation({
    mutationFn: (updatedBalance) => api.updateBalance(updatedBalance),
    onSuccess: () => {
      toast.success(`${balanceData.name} başarıyla güncellendi!`);
      queryClient.invalidateQueries({ queryKey: ['balances', date, period] });
      setIsCardEditing(false);
    },
    onError: (error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const handleValueChange = (currency, event) => {
    setFormState(prev => ({ ...prev, [currency]: event.target.value }));
  };

  const handleSave = () => {
    if (!isDirty) return;
    const finalState = {
        try: parseFloat(formState.try) || 0,
        usd: parseFloat(formState.usd) || 0,
        eur: parseFloat(formState.eur) || 0,
    };
    mutation.mutate({ balanceId: balanceData.id, ...finalState });
  };

  const handleContainerClick = () => {
    if (!isPersisted && !isCardEditing) {
      setIsCardEditing(true);
    }
  };

  // Use persisted rates if available, otherwise use hardcoded mock rates
  const usdRate = balanceData.kur_usd_try || 35.12;
  const eurRate = balanceData.kur_eur_try || 38.45;
  const totalInTry = (parseFloat(formState.try) || 0) + (parseFloat(formState.usd) || 0) * usdRate + (parseFloat(formState.eur) || 0) * eurRate;

  const getCombinedContainerStyle = () => {
    const style = { ...cardStyles.container };

    if (isPersisted) {
      style.borderColor = 'var(--primary-color-dark)';
    } else {
      if (isCardEditing) {
        Object.assign(style, cardStyles.containerHover);
      } else if (isHovered) {
        Object.assign(style, cardStyles.containerHover);
      } else {
        style.borderColor = 'transparent';
      }
    }

    style.cursor = !isPersisted && !isCardEditing ? 'pointer' : 'default';
    return style;
  };

  const editButtonStyle = {
    ...cardStyles.iconButton,
    ...(isHovered && isPersisted && !isCardEditing && { color: 'var(--primary-color)' }),
  };

  const showStatusBar = isPersisted && !isCardEditing;

  return (
    <div
      ref={cardRef}
      style={getCombinedContainerStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleContainerClick}
    >
      <div style={{...cardStyles.statusBar, opacity: showStatusBar ? 1 : 0}}></div>
      
      {mutation.isLoading && <div style={cardStyles.loadingOverlay}><FiLoader className="animate-spin" size={24} color="var(--primary-color)" /></div>}
      
      <div style={cardStyles.bankInfo}>
        {balanceData.logo && <img src={balanceData.logo} alt="" style={cardStyles.logo} />}
        <span style={cardStyles.bankName}>{balanceData.name}</span>
      </div>

      <Tooltip title={isPersisted ? `Kurlar: USD: ${usdRate?.toFixed(4)} | EUR: ${eurRate?.toFixed(4)}` : 'Güncel kurlarla hesaplanıyor'}>
        <div style={cardStyles.totalHighlight}>
          <span style={cardStyles.totalHighlightLabel}>Toplam:</span>
          <span style={cardStyles.totalHighlightValue}>
              {totalInTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </Tooltip>

      <EditableTotal ref={tryInputRef} label="TRY" value={formState.try} onChange={(e) => handleValueChange('try', e)} onEnterPress={handleSave} isEditing={isCardEditing} isHot={isCardEditing} />
      <EditableTotal label="USD" value={formState.usd} onChange={(e) => handleValueChange('usd', e)} onEnterPress={handleSave} isEditing={isCardEditing} isHot={isCardEditing} />
      <EditableTotal label="EUR" value={formState.eur} onChange={(e) => handleValueChange('eur', e)} onEnterPress={handleSave} isEditing={isCardEditing} isHot={isCardEditing} />

      <div style={cardStyles.actions}>
        {isCardEditing ? (
          <>
            <Tooltip title="Kaydet">
              <Button
                type="text"
                icon={<FiSave size={18} />}
                onClick={handleSave}
                disabled={!isDirty || mutation.isLoading}
                style={{ color: isDirty ? 'var(--success-color)' : 'var(--text-color-light)' }}
              />
            </Tooltip>
            {isPersisted && (
              <Tooltip title="İptal">
                <Button
                  type="text"
                  icon={<FiX size={20} />}
                  onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                  className="cancel-button"
                />
              </Tooltip>
            )}
          </>
        ) : (
          <Tooltip title="Düzenle">
            <Button
                type="text"
                icon={<EditOutlined style={{ color: 'var(--text-color-secondary)' }} />}
                onClick={(e) => { e.stopPropagation(); setIsCardEditing(true); }}
              />
          </Tooltip>
        )}
      </div>
    </div>
  );
}