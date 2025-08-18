// src/features/dashboard/activity-log/ReminderListItem.jsx

import React from 'react';
import { List, Typography, Button, Dropdown, Menu, Tag } from 'antd';
import { MoreOutlined, DeleteOutlined, CheckSquareOutlined } from '@ant-design/icons';
import styles from '../styles/ActivityLog.module.css';
import dayjs from 'dayjs';

const { Text } = Typography;

const ReminderListItem = ({ reminder, visuals, onAction, onDismiss }) => {

  const handleMenuClick = (e) => {
    e.domEvent.stopPropagation();
  };
  
  const menuItems = [];

  if (reminder.meta?.entry_type === 'cc_due') {
    menuItems.push(
      <Menu.Item 
        key="mark_paid" 
        icon={<CheckSquareOutlined />} 
        onClick={(e) => {
            handleMenuClick(e);
            onDismiss(reminder.id);
        }}
      >
        Ödeme Yapıldı
      </Menu.Item>
    );
  }

  menuItems.push(
    <Menu.Item 
      key="dismiss" 
      danger 
      icon={<DeleteOutlined />} 
      onClick={(e) => {
        handleMenuClick(e);
        onDismiss(reminder.id);
      }}
    >
      Ertele
    </Menu.Item>
  );

  const menu = <Menu>{menuItems}</Menu>;

  return (
    // DEĞİŞİKLİK: Satır içi stiller kaldırıldı, artık tüm stil CSS modülünden geliyor.
    <List.Item
      className={`${styles.summaryListItem} ${styles.clickable}`}
      onClick={() => onAction(reminder)}
    >
      <div className={styles.reminderRow}>
        <div className={styles.reminderContent}>
          <div
            className={styles.reminderIconWrapper}
            style={{ backgroundColor: `${visuals.color}20` }} // Sadece dinamik renk burada kalıyor
          >
            {React.cloneElement(visuals.icon, {
              style: {
                color: visuals.color,
                fontSize: '18px'
              }
            })}
          </div>
          <div className={styles.reminderTextContainer}>
            <Text className={styles.listItemTitle} ellipsis={{ tooltip: reminder.description }}>
              {reminder.description}
            </Text>
            <Text className={styles.listItemDescription} ellipsis={{ tooltip: reminder.title }}>
              {reminder.title}
            </Text>
            {reminder.type === 'DUE_DATE_UPCOMING' && reminder.due_date && (
              <div style={{ marginTop: '4px' }}>
                <Tag color="volcano">Son Ödeme: {dayjs(reminder.due_date).format('DD MMMM')}</Tag>
              </div>
            )}
          </div>
        </div>
        <div className={styles.reminderActions}>
          <Dropdown overlay={menu} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined style={{ fontSize: '20px' }} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>
    </List.Item>
  );
};

export default ReminderListItem;