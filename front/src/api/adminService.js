import { api } from './api';

/**
 * Tüm rolleri listeler.
 * @returns {Promise<Array>} Roller listesi.
 */
export const getRoles = async () => {
  const response = await api.get('/admin/roles');
  return response.data;
};

/**
 * Sistemdeki tüm tanımlı izinleri listeler.
 * @returns {Promise<Array>} İzinler listesi.
 */
export const getPermissions = async () => {
  const response = await api.get('/admin/permissions');
  return response.data;
};

/**
 * Belirli bir rolün sahip olduğu izinlerin ID'lerini getirir.
 * @param {number} roleId Rolün ID'si.
 * @returns {Promise<Array>} İzin ID'leri listesi.
 */
export const getRolePermissions = async (roleId) => {
  const response = await api.get(`/admin/roles/${roleId}/permissions`);
  return response.data;
};

/**
 * Bir rolün izinlerini günceller.
 * @param {number} roleId Rolün ID'si.
 * @param {Array<number>} permissionIds Yeni izin ID'leri listesi.
 * @returns {Promise<object>} Başarı mesajı.
 */
export const updateRolePermissions = async (roleId, permissionIds) => {
  const response = await api.put(`/admin/roles/${roleId}/permissions`, {
    permission_ids: permissionIds,
  });
  return response.data;
};