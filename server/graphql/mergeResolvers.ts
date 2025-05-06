/**
 * Утилита для правильного слияния резолверов GraphQL
 * Особенно когда резолверы хранятся в массиве
 */

/**
 * Объединяет массив резолверов в один общий объект резолверов
 * Это важно для корректной работы схемы GraphQL
 * 
 * @param resolvers Массив объектов резолверов
 * @returns Объединенный объект резолверов
 */
export function mergeResolvers(resolvers: any[]): any {
  // Базовый пустой объект для хранения всех типов резолверов
  const mergedResolvers: any = {
    Query: {},
    Mutation: {},
    Subscription: {},
  };
  
  // Обрабатываем каждый резолвер в массиве
  resolvers.forEach(resolver => {
    // Если в резолвере есть Query, добавляем его поля
    if (resolver.Query) {
      mergedResolvers.Query = {
        ...mergedResolvers.Query,
        ...resolver.Query,
      };
    }
    
    // Если в резолвере есть Mutation, добавляем его поля
    if (resolver.Mutation) {
      mergedResolvers.Mutation = {
        ...mergedResolvers.Mutation,
        ...resolver.Mutation,
      };
    }
    
    // Если в резолвере есть Subscription, добавляем его поля
    if (resolver.Subscription) {
      mergedResolvers.Subscription = {
        ...mergedResolvers.Subscription,
        ...resolver.Subscription,
      };
    }
    
    // Обрабатываем другие типы резолверов (не Query, Mutation, Subscription)
    Object.keys(resolver).forEach(key => {
      if (key !== 'Query' && key !== 'Mutation' && key !== 'Subscription') {
        // Если этот тип еще не существует в слитых резолверах, создаем его
        if (!mergedResolvers[key]) {
          mergedResolvers[key] = {};
        }
        
        // Слияние полей для этого типа
        mergedResolvers[key] = {
          ...mergedResolvers[key],
          ...resolver[key],
        };
      }
    });
  });
  
  // Удаляем пустые объекты, чтобы не создавать лишних типов
  if (Object.keys(mergedResolvers.Query).length === 0) {
    delete mergedResolvers.Query;
  }
  
  if (Object.keys(mergedResolvers.Mutation).length === 0) {
    delete mergedResolvers.Mutation;
  }
  
  if (Object.keys(mergedResolvers.Subscription).length === 0) {
    delete mergedResolvers.Subscription;
  }
  
  return mergedResolvers;
}
