// /front/src/features/credits/bank-logs/styles.jsx

import 'react-datepicker/dist/react-datepicker.css';

export const styles = {
  // Main container
  container: {
    padding: 'var(--spacing-lg)',
    backgroundColor: 'var(--background-color-light)',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
  },
  // Header section
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-lg)',
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--text-color-primary)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  // Main Layout
  mainLayout: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
  },
  content: {
    flex: 5,
  },
  sidebar: {
    flex: 1,
  },
  // Date Picker custom styles
  datePickerWrapper: {
    position: 'relative',
    '.react-datepicker': {
      fontFamily: "'Inter', sans-serif",
      border: '1px solid var(--border-color-light)',
      borderRadius: 'var(--border-radius-base)',
      boxShadow: '0 4px 12px var(--shadow-color-10)',
    },
    '.react-datepicker__header': {
      backgroundColor: 'var(--background-color-soft)',
      borderBottom: 'none',
    },
    '.react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header': {
        color: 'var(--text-color-primary)',
        fontWeight: 'bold',
    },
    '.react-datepicker__day--selected, .react-datepicker__day--keyboard-selected': {
      backgroundColor: 'var(--primary-color)',
      color: 'var(--background-color-white)',
    },
    '.react-datepicker__day:hover': {
        backgroundColor: 'var(--primary-color-20)',
    },
    '.react-datepicker__input-container input': {
        padding: 'var(--spacing-sm) var(--spacing-md)',
        border: '1px solid var(--border-color-light)',
        borderRadius: 'var(--border-radius-base)',
        fontSize: '1rem',
        width: '150px',
        textAlign: 'center',
        cursor: 'pointer',
    }
  },
  // Period Toggle (Segmented Control)
  toggleContainer: {
    display: 'flex',
    backgroundColor: 'var(--border-color-dark)',
    borderRadius: 'var(--border-radius-base)',
    padding: 'var(--spacing-xs)',
  },
  toggleButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-color-secondary)',
    cursor: 'pointer',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: '500',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
  },
  toggleButtonActive: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    backgroundColor: 'var(--background-color-white)',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 'bold',
    boxShadow: '0 1px 3px var(--shadow-color-08)',
  },
  // Bank Card List
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  // Loading/Error states
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '1.2rem',
    color: 'var(--text-color-secondary)',
  },
  centeredError: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '1.2rem',
    color: 'var(--error-color)',
    fontWeight: 'bold',
  },
};
