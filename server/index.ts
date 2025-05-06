import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express from 'express';
import http from 'node:http';
import cors from 'cors'
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client'
import { handleError, withDateErrorHandling } from './utils/error-handler';



// Load environment variables
dotenv.config();

// Import schema and resolvers
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';

// Create PubSub instance for subscriptions
export const pubsub = new PubSub();

// Initialize Express
const app = express();
const httpServer = http.createServer(app);

// Setup Prometheus metrics
const register = new Registry();
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const graphqlOperationCounter = new Counter({
  name: 'graphql_operations_total',
  help: 'Count of GraphQL operations',
  labelNames: ['operation', 'type']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(graphqlOperationCounter);

// Create WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Create schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Set up WebSocket server
const serverCleanup = useServer({
  schema,
  context: (ctx) => {
    // Extract token from connection params if available
    const token = ctx.connectionParams?.Authorization || '';

    // Verify and decode JWT for authenticated subscriptions
    let user = null;
    if (token && typeof token === 'string') {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET!);
        user = decoded;
      } catch (err) {
        console.error('Invalid token in subscription:', err);
      }
    }

    return {
      user,
      pubsub
    };
  }
}, wsServer);

// Create Apollo Server
const server = new ApolloServer({
  schema,
  formatError: (formattedError, error) => {
    // Обработка типичных ошибок с датами
    if (formattedError.message?.includes('toISOString') || 
        formattedError.message?.includes('Invalid date')) {
      return {
        message: 'Неверный формат даты. Используйте формат YYYY-MM-DD',
        locations: formattedError.locations,
        path: formattedError.path,
        extensions: {
          code: 'BAD_USER_INPUT',
          originalError: formattedError.message
        }
      };
    }
    
    // Ошибка с перечислением (enum)
    if (formattedError.message?.includes('got invalid value') && 
        formattedError.message?.includes('does not exist in')) {
      return {
        message: 'Недопустимое значение для перечисления. Возможно, значение "all" не поддерживается',
        locations: formattedError.locations,
        path: formattedError.path,
        extensions: {
          code: 'BAD_USER_INPUT',
          originalError: formattedError.message
        }
      };
    }
    
    // Ошибка с null значением для non-nullable поля
    if (formattedError.message?.includes('Cannot return null for non-nullable field')) {
      return {
        message: 'Внутренняя ошибка: Обязательное поле не может быть пустым',
        locations: formattedError.locations,
        path: formattedError.path,
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: formattedError.message
        }
      };
    }
    
    // Возвращаем оригинальную ошибку, если не обработана
    return formattedError;
  },
  plugins: [
    // Proper shutdown for HTTP server
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for WebSocket server
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
    // Plugin to track operation metrics
    {
      async requestDidStart(requestContext) {
        const startTime = process.hrtime.bigint();
        const operationType = requestContext.request.operationName || 'anonymous';
        const type = requestContext.operation?.operation || 'unknown';

        graphqlOperationCounter.inc({ operation: operationType, type });

        return {
          async willSendResponse(requestContext) {
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1_000_000;

            httpRequestDurationMicroseconds.observe(
              {
                method: 'POST',
                route: '/graphql',
                status_code: requestContext.response.http?.status || 200
              },
              durationMs / 1000
            );
          }
        };
      }
    },
  ],
});

// Start server
async function startServer() {
  await server.start();

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Apply middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  // Start HTTP server
  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}/graphql`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
