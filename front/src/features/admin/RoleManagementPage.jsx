import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Checkbox, Row, Col, message, Spin, Typography, Divider, Alert } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getRoles, getPermissions, getRolePermissions, updateRolePermissions } from '../../api/adminService';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function RoleManagementPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(false); // Sadece bir tane loading state'i yeterli
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesData, permissionsData] = await Promise.all([getRoles(), getPermissions()]);
        setRoles(rolesData);
        const allPerms = Object.values(permissionsData).flat();
        setPermissions(allPerms);
      } catch (error) {
        message.error("Rol ve yetki verileri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading && isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading]);

  const handleEditPermissions = async (role) => {
    setLoading(true);
    try {
      setSelectedRole(role);
      const currentPerms = await getRolePermissions(role.id);
      setRolePermissions(currentPerms);
      setIsModalVisible(true);
    } catch (error) {
      message.error("Rol yetkileri alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateRolePermissions(selectedRole.id, rolePermissions);
      message.success(`'${selectedRole.name}' rolünün yetkileri başarıyla güncellendi.`);
      setIsModalVisible(false);
      setSelectedRole(null);
    } catch (error) {
      message.error("Yetkiler güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, permission) => {
      const group = permission.name.split(':')[0] || 'diğer';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const columns = [
    { 
      title: 'Rol Adı', 
      dataIndex: 'name', 
      key: 'name' 
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Button icon={<EditOutlined />} onClick={() => handleEditPermissions(record)}>
          Yetkileri Düzenle
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Rol ve Yetki Yönetimi</Title>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={roles} // <-- Veriyi tabloya bağlayan satır
          rowKey="id"      // <-- Her satır için benzersiz anahtarı belirten satır
          pagination={false}
        />
      </Spin>
      {selectedRole && (
        <Modal
          title={<Title level={4}>{selectedRole.name} Rolünün Yetkileri</Title>}
          open={isModalVisible}
          onOk={handleSave}
          onCancel={() => setIsModalVisible(false)}
          width={800}
          confirmLoading={loading}
        >
          <Alert message="Bir rolün yetkilerini değiştirmek, o role sahip tüm kullanıcıları etkileyecektir." type="info" showIcon style={{marginBottom: 24}}/>
          <Checkbox.Group
            style={{ width: '100%' }}
            value={rolePermissions}
            onChange={(checkedValues) => setRolePermissions(checkedValues)}
          >
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group}>
                <Divider orientation="left"><Text strong style={{textTransform: 'capitalize'}}>{group}</Text></Divider>
                <Row>
                  {perms.map(p => (
                    <Col span={8} key={p.id}>
                      <Checkbox value={p.id}>{p.description}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </Checkbox.Group>
        </Modal>
      )}
    </div>
  );
}