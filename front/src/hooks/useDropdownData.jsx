import { useState, useEffect } from 'react';
import { message } from 'antd';
// Doğru importlar:
import { accountNameService } from '../api/accountNameService';
import { budgetItemService } from '../api/budgetItemService';
import { customerService } from '../api/customerService';
import { paymentTypeService } from '../api/paymentTypeService';
import { regionService } from '../api/regionService';

/**
 * Dropdown bileşenleri için gerekli olan verileri API'den çeken custom hook.
 * Bu hook, verileri tek bir yerden yöneterek kod tekrarını önler.
 */
const useDropdownData = () => {
    // Verileri ve yüklenme durumunu tutacak state'ler
    const [dropdownData, setDropdownData] = useState({
        customers: [],
        regions: [],
        paymentTypes: [],
        accountNames: [],
        budgetItems: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Veri çekme işlemini yönetecek asenkron fonksiyon
        const fetchAllData = async () => {
            try {
                // Tüm servislerin `getAll` metodunu aynı anda çağırmak için Promise.all kullanılır.
                // Bu, tüm verilerin paralel olarak çekilmesini sağlayarak performansı artırır.
                const [
                    customersRes,
                    regionsRes,
                    paymentTypesRes,
                    accountNamesRes,
                    budgetItemsRes
                ] = await Promise.all([
                    customerService.getAll(),
                    regionService.getAll(),
                    paymentTypeService.getAll(),
                    accountNameService.getAll(),
                    budgetItemService.getAll()
                ]);

                // Gelen verileri state'e set et
                setDropdownData({
                    customers: customersRes.data || [],
                    regions: regionsRes.data || [],
                    paymentTypes: paymentTypesRes.data || [],
                    accountNames: accountNamesRes.data || [],
                    budgetItems: budgetItemsRes.data || [],
                });

            } catch (error) {
                console.error("Dropdown verileri çekilirken hata oluştu:", error);
                message.error("Veriler yüklenirken bir sorun oluştu.");
            } finally {
                // Veri çekme işlemi tamamlansın veya hata alınsın, yüklenme durumu false yapılır.
                setLoading(false);
            }
        };

        fetchAllData();
    }, []); // Bu useEffect sadece bileşen ilk render edildiğinde bir kez çalışır.

    // Hook'un dışarıya döndüreceği değerler
    return { ...dropdownData, loading };
};

export default useDropdownData;