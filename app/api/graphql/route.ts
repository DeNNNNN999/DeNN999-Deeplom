import { NextRequest, NextResponse } from 'next/server';
import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from '@/server/graphql/typeDefs';
import { createContext } from '@/server/graphql/context';
import { resolvers } from '@/server/graphql/resolvers';
import { scalars } from '@/server/graphql/scalars';
import { mergeResolvers } from '@/server/graphql/mergeResolvers';
import { checkGraphQLSchema } from '@/app/health-check';

// Проверяем схему при запуске сервера
checkGraphQLSchema().catch(error => {
  console.error('Критическая ошибка при проверке схемы:', error);
});

// Создаем схему GraphQL вручную, используя createSchema
// Объединяем резолверы правильным образом
const mergedResolvers = mergeResolvers(resolvers);

const schema = createSchema({
  typeDefs,
  resolvers: {
    ...mergedResolvers,
    ...scalars, // Добавляем скаляры в резолверы
  }
});

// Создаем Yoga instance с корректной схемой
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: (initialContext) => {
    try {
      // Обеспечиваем передачу всех необходимых данных
      return createContext({
        ...initialContext,
        req: initialContext.request,
        headers: initialContext.request?.headers || initialContext.headers,
      });
    } catch (error) {
      console.error('Error creating context in yoga:', error);
      return createContext({}); // Возвращаем пустой контекст, чтобы не уронить сервер
    }
  },
  // Настройки для улучшения ошибок
  maskedErrors: false,
  landingPage: false,
});

// Добавляем обработку ошибок
// Handle all HTTP methods
export async function GET(request: NextRequest) {
  try {
    return await handleRequest(request, { 
      request, 
      headers: request.headers 
    });
  } catch (error) {
    console.error('GraphQL GET error:', error);
    return new NextResponse(JSON.stringify({
      errors: [{
        message: `GraphQL error: ${error.message || 'Unknown error'}`,
        path: ['graphql', 'error'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' }
      }]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleRequest(request, { 
      request, 
      headers: request.headers 
    });
  } catch (error) {
    console.error('GraphQL POST error:', error);
    return new NextResponse(JSON.stringify({
      errors: [{
        message: `GraphQL error: ${error.message || 'Unknown error'}`,
        path: ['graphql', 'error'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' }
      }]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
