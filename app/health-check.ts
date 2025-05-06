// Скрипт для проверки правильности работы GraphQL сервера
import { createSchema } from 'graphql-yoga';
import { typeDefs } from '@/server/graphql/typeDefs';
import { resolvers } from '@/server/graphql/resolvers';
import { scalars } from '@/server/graphql/scalars';
import { mergeResolvers } from '@/server/graphql/mergeResolvers';

/**
 * Функция для проверки корректности схемы GraphQL
 * Запускается при инициализации сервера
 */
export async function checkGraphQLSchema() {
  try {
    console.log('🔍 Проверка схемы GraphQL...');
    
    // Корректно объединяем резолверы из массива в единый объект
    const mergedResolvers = resolvers.reduce((acc, resolver) => {
      return { ...acc, ...resolver };
    }, {});
    
    // Создаем схему
    const schema = createSchema({
      typeDefs,
      resolvers: {
        ...mergedResolvers,
        ...scalars,
      }
    });
    
    console.log('✅ Схема GraphQL валидна!');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при валидации схемы GraphQL:', error);
    return false;
  }
}
