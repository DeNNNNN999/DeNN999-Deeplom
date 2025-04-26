import { db } from '../index';
import { users, systemSettings, permissions } from '../schema';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Загрузка переменных окружения
dotenv.config();

async function seedAdminUser() {
  try {
    console.log('Проверка наличия администратора...');
    
    // Проверим, существует ли уже администратор с этим email
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    
    if (existingAdmin.length > 0) {
      console.log('Администратор уже существует в системе.');
      return;
    }
    
    // Хеширование пароля
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Создание администратора
    console.log('Создание администратора...');
    const adminResult = await db.insert(users).values({
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: 'IT',
      isActive: true,
      lastLogin: new Date(),
    }).returning();
    
    const admin = adminResult[0];
    console.log(`Администратор создан с ID: ${admin.id}`);
    
    // Инициализация базовых настроек системы
    console.log('Инициализация системных настроек...');
    
    const defaultSettings = [
      {
        key: 'company_name',
        value: 'Supplier Management System',
        description: 'Название компании отображаемое в интерфейсе',
        dataType: 'string',
        isPublic: true,
        updatedById: admin.id,
      },
      {
        key: 'currency_default',
        value: 'USD',
        description: 'Валюта по умолчанию для финансовых операций',
        dataType: 'string',
        isPublic: true,
        updatedById: admin.id,
      },
      {
        key: 'contract_expiry_days',
        value: '30',
        description: 'За сколько дней до истечения контракта отправлять уведомления',
        dataType: 'number',
        isPublic: false,
        updatedById: admin.id,
      },
    ];
    
    for (const setting of defaultSettings) {
      await db.insert(systemSettings).values(setting);
    }
    
    console.log('Системные настройки инициализированы.');
    
    // Инициализация базовых разрешений
    console.log('Инициализация разрешений...');
    
    const rolePermissions = [
      // Разрешения для админа
      { role: 'ADMIN', resource: 'USER', action: 'CREATE', isGranted: true },
      { role: 'ADMIN', resource: 'USER', action: 'READ', isGranted: true },
      { role: 'ADMIN', resource: 'USER', action: 'UPDATE', isGranted: true },
      { role: 'ADMIN', resource: 'USER', action: 'DELETE', isGranted: true },
      
      // Разрешения для менеджера
      { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'APPROVE', isGranted: true },
      { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'REJECT', isGranted: true },
      { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'APPROVE', isGranted: true },
      { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'REJECT', isGranted: true },
      
      // Разрешения для специалиста
      { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'CREATE', isGranted: true },
      { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'READ', isGranted: true },
      { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'UPDATE', isGranted: true },
    ];
    
    for (const perm of rolePermissions) {
      await db.insert(permissions).values(perm);
    }
    
    console.log('Разрешения инициализированы.');
    console.log('Инициализация системы завершена успешно!');
    
  } catch (error) {
    console.error('Ошибка при инициализации системы:', error);
  } finally {
    // Закрытие соединения с базой данных
    process.exit(0);
  }
}

// Запуск сидирования
seedAdminUser();