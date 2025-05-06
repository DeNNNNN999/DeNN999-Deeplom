import { GraphQLScalarType, Kind } from 'graphql';

// DateTime скаляр для работы с датами
export const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime scalar type',
  
  // Сериализация: преобразование JavaScript Date объекта в строку ISO
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString(); // Преобразование даты в ISO строку
    }
    if (typeof value === 'string' || value instanceof String) {
      return new Date(value).toISOString();
    }
    return null;
  },
  
  // Парсинг из переменных
  parseValue(value) {
    if (typeof value === 'string' || value instanceof String) {
      return new Date(value); // Преобразование строки в JavaScript Date
    }
    return null;
  },
  
  // Парсинг из AST
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value); // Парсинг строкового литерала
    }
    return null;
  },
});

// JSON скаляр для работы с произвольными JSON объектами
export const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON scalar type',
  
  serialize(value) {
    return value; // Как есть, так как JSON уже нативно поддерживается
  },
  
  parseValue(value) {
    return value; // Как есть
  },
  
  parseLiteral(ast) {
    // Для парсинга более сложных JSON объектов из AST
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT:
        return ast.fields.reduce((obj, field) => {
          obj[field.name.value] = this.parseLiteral(field.value);
          return obj;
        }, {});
      case Kind.LIST:
        return ast.values.map(value => this.parseLiteral(value));
      default:
        return null;
    }
  },
});

// Экспортируем все скаляры в правильном формате для GraphQL
export const scalars = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,
};
