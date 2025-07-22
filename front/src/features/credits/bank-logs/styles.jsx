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
