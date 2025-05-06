import { GraphQLScalarType, Kind } from 'graphql';

/**
 * Скалярный тип для дат в GraphQL
 * Поддерживает преобразование между объектами Date и строками
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date and time scalar type',
  
  // Преобразование из внутреннего представления GraphQL в ответ клиенту
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Если значение - строка, возвращаем её как есть 
    if (typeof value === 'string') {
      return value;
    }
    
    // В остальных случаях возвращаем null
    return null;
  },
  
  // Преобразование из значения, отправленного клиентом, во внутреннее представление
  parseValue(value) {
    if (typeof value === 'string') {
      // Для строк пробуем создать объект Date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return value; // Возвращаем строку, а не объект Date
      }
    }
    
    // Если передано что-то другое или неверная строка, возвращаем null
    return null;
  },
  
  // Преобразование из AST GraphQL в значение
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      // Для строковых литералов пробуем создать объект Date
      const date = new Date(ast.value);
      if (!isNaN(date.getTime())) {
        return ast.value; // Возвращаем строку, а не объект Date
      }
    }
    
    // Для всех остальных случаев возвращаем null
    return null;
  }
});
