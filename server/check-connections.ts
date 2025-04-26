import { db, checkDatabaseConnection } from './db';
import * as redis from 'redis';
import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

async function checkRedisConnection() {
  try {
    const client = redis.createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    
    await client.connect();
    
    // Тестовое сохранение и получение данных
    await client.set('connection_test', 'OK');
    const value = await client.get('connection_test');
    await client.del('connection_test');
    
    await client.disconnect();
    
    return value === 'OK';
  } catch (error) {
    console.error('Ошибка подключения к Redis:', error);
    return false;
  }
}

async function checkJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return false;
  }
  
  // Проверка минимальной длины ключа (рекомендуется не менее 32 символов)
  return jwtSecret.length >= 32;
}

async function checkConnections() {
  console.log(`${colors.cyan}=== Проверка подключений к службам ===${colors.reset}\n`);
  
  // Проверка подключения к PostgreSQL
  console.log(`${colors.magenta}Проверка PostgreSQL...${colors.reset}`);
  const dbConnected = await checkDatabaseConnection();
  
  if (dbConnected) {
    console.log(`${colors.green}✓ PostgreSQL: Подключено успешно${colors.reset}`);
    
    // Подсчет количества пользователей
    try {
      const userCountResult = await db.select({ count: sql`COUNT(*)` }).from(users);
      const userCount = Number(userCountResult[0]?.count || 0);
      console.log(`  - Количество пользователей в системе: ${userCount}`);
      
      if (userCount === 0) {
        console.log(`  ${colors.yellow}⚠ В системе нет пользователей. Запустите: npm run seed:admin${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Ошибка при подсчете пользователей: ${error}${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ PostgreSQL: Не удалось подключиться${colors.reset}`);
    console.log(`  Проверьте следующие настройки в .env:`);
    console.log(`  - DATABASE_HOST=${process.env.DATABASE_HOST}`);
    console.log(`  - DATABASE_PORT=${process.env.DATABASE_PORT}`);
    console.log(`  - DATABASE_NAME=${process.env.DATABASE_NAME}`);
    console.log(`  - DATABASE_USER=${process.env.DATABASE_USER}`);
    console.log(`  - DATABASE_PASSWORD=*******`);
  }
  
  console.log('');
  
  // Проверка подключения к Redis
  console.log(`${colors.magenta}Проверка Redis...${colors.reset}`);
  const redisConnected = await checkRedisConnection();
  
  if (redisConnected) {
    console.log(`${colors.green}✓ Redis: Подключено успешно${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Redis: Не удалось подключиться${colors.reset}`);
    console.log(`  Проверьте следующие настройки в .env:`);
    console.log(`  - REDIS_HOST=${process.env.REDIS_HOST}`);
    console.log(`  - REDIS_PORT=${process.env.REDIS_PORT}`);
  }
  
  console.log('');
  
  // Проверка JWT ключа
  console.log(`${colors.magenta}Проверка JWT...${colors.reset}`);
  const jwtValid = await checkJwtSecret();
  
  if (jwtValid) {
    console.log(`${colors.green}✓ JWT: Ключ настроен корректно${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ JWT: Проблема с ключом шифрования${colors.reset}`);
    console.log(`  - JWT_SECRET должен быть длиной не менее 32 символов`);
    console.log(`  - Проверьте настройку JWT_SECRET в .env файле`);
  }
  
  console.log('');
  console.log(`${colors.cyan}=== Итоги проверки ===${colors.reset}`);
  
  if (dbConnected && redisConnected && jwtValid) {
    console.log(`${colors.green}✓ Все соединения проверены и работают корректно${colors.reset}`);
    console.log(`  Вы можете запустить сервер: npm run server`);
  } else {
    console.log(`${colors.red}✗ Обнаружены проблемы с соединениями${colors.reset}`);
    console.log(`  Исправьте проблемы перед запуском сервера`);
  }
}

// Запуск проверки
checkConnections()
  .catch(error => {
    console.error(`${colors.red}Ошибка при проверке соединений:${colors.reset}`, error);
  })
  .finally(() => {
    // Завершение скрипта
    setTimeout(() => process.exit(0), 100);
  });
