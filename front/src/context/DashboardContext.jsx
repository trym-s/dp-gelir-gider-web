import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('monthly');
    const [refresh, setRefresh] = useState(0);

    // API çağrıları için debounced değerler
    const [debouncedCurrentDate, setDebouncedCurrentDate] = useState(currentDate);
    const [debouncedViewMode, setDebouncedViewMode] = useState(viewMode);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCurrentDate(currentDate);
        }, 500); // 500ms gecikme

        return () => {
            clearTimeout(handler);
        };
    }, [currentDate]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedViewMode(viewMode);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [viewMode]);

    const triggerRefresh = () => setRefresh(prev => prev + 1);

    const value = {
        currentDate, // Kontroller için anlık state
        setCurrentDate,
        viewMode, // Kontroller için anlık state
        setViewMode,
        debouncedCurrentDate, // Grafikler ve API için gecikmeli state
        debouncedViewMode, // Grafikler ve API için gecikmeli state
        refresh,
        triggerRefresh,
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};
