# Supplier Management System

A comprehensive system for managing suppliers, contracts, and procurement processes with role-based access control.

![Supplier Management System](https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)

## Features

- **Role-based Access Control**: Different dashboards and permissions for admins, procurement managers, and procurement specialists
- **Supplier Management**: Create, review, approve, and manage suppliers
- **Contract Management**: Create and monitor contracts with automatic expiry notifications
- **Payment Tracking**: Process and approve supplier payments
- **Document Management**: Upload and organize supplier and contract documents
- **Performance Metrics**: Track supplier performance with ratings and analytics
- **Audit Logging**: Comprehensive activity tracking for compliance and security
- **Responsive UI**: Works on desktop and mobile devices

## Technology Stack

### Frontend
- **Next.js**: React framework for server-rendered applications
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **GraphQL Client**: For data fetching with GraphQL queries and mutations
- **React Hook Form**: For form handling and validation
- **Sonner**: For toast notifications

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **Apollo GraphQL**: GraphQL server implementation
- **PostgreSQL**: Relational database
- **Drizzle ORM**: TypeScript ORM for database operations
- **Redis**: For caching and performance optimization
- **JSON Web Tokens (JWT)**: For authentication

### DevOps & Monitoring
- **Docker & Docker Compose**: For containerization
- **Prometheus**: For monitoring and alerting
- **GitHub Actions**: For CI/CD

## System Architecture

The system follows a modern architecture with the following components:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Next.js    │────▶│  GraphQL    │────▶│  Business   │────▶│ PostgreSQL  │
│  Frontend   │     │  API        │     │  Logic      │     │ Database    │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                    │                   ▲
                          │                    │                   │
                          ▼                    ▼                   │
                    ┌─────────────┐     ┌─────────────┐           │
                    │             │     │             │           │
                    │  Redis      │     │  Audit      │───────────┘
                    │  Cache      │     │  Logging    │
                    │             │     │             │
                    └─────────────┘     └─────────────┘
```

### Data Flow

1. **Frontend** makes GraphQL requests to the API server
2. **API Server** validates requests and processes them through business logic
3. **Business Logic** interacts with the database and other services
4. **Redis Cache** speeds up frequent queries
5. **Audit Logging** records all system activities for compliance
6. **Prometheus** monitors system health and performance

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)
- Redis (if running without Docker)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/supplier-management-system.git
cd supplier-management-system
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration.

### Running with Docker

Start the entire system with Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- API server
- Frontend application
- Prometheus monitoring

Access the application at http://localhost:3000

### Running Locally (Development)

1. Start the backend API server:

```bash
npm run server
```

2. In a separate terminal, start the frontend development server:

```bash
npm run dev
```

3. Access the application at http://localhost:3000

### Database Setup

1. Run database migrations:

```bash
npm run drizzle:push
```

2. (Optional) Seed the database with sample data:

```bash
npm run seed
```

## Running Tests

### Unit Tests

```bash
npm run test
```

For watch mode:

```bash
npm run test:watch
```

### End-to-End Tests

First, ensure the application is running (either with Docker or locally).

```bash
npm run e2e
```

## Role-Based Access

The system has three roles:

1. **Admin**: Full access to all features, user management, and system settings.
2. **Procurement Manager**: Can approve suppliers and contracts, manage categories, and access analytics.
3. **Procurement Specialist**: Can create suppliers and contracts, manage documents, and track payments.

Default admin credentials:
- Email: admin@example.com
- Password: admin123

## Development

### File Structure

```
├── app/                  # Next.js pages and application routes
├── components/           # React components
│   ├── layout/           # Layout components like header, sidebar
│   └── ui/               # UI components
├── lib/                  # Utility functions and libraries
├── public/               # Static assets
├── server/               # Backend API
│   ├── db/               # Database schema and migrations
│   ├── graphql/          # GraphQL schema and resolvers
│   ├── services/         # Business logic services
│   └── utils/            # Server utilities
├── tests/                # Test files
│   ├── e2e/              # End-to-end tests (Playwright)
│   ├── integration/      # Integration tests
│   └── unit/             # Unit tests
└── docker-compose.yml    # Docker configuration
```

### GraphQL API

The GraphQL API endpoint is available at `/graphql`. The API supports:

- Queries: For fetching data
- Mutations: For modifying data
- Subscriptions: For real-time updates (WebSocket)

### Adding New Features

1. Define the database schema in `server/db/schema.ts`
2. Add GraphQL types in `server/graphql/typeDefs/index.ts`
3. Implement resolvers in `server/graphql/resolvers/`
4. Create frontend components and pages

## Monitoring

Prometheus is configured to scrape metrics from the application. Access the Prometheus dashboard at http://localhost:9090 when running with Docker.

Metrics available:
- API request counts and latencies
- Error rates
- Database connection pool stats
- System resource utilization

## Deployment

### Production Deployment

For production deployment, we recommend:

1. Using a container orchestration platform like Kubernetes
2. Setting up a production-grade PostgreSQL database
3. Configuring Redis with persistence
4. Setting up proper TLS/SSL termination
5. Implementing proper secrets management

### CI/CD Pipeline

The repository includes GitHub Actions workflows for:

- Running tests on pull requests
- Building and publishing Docker images
- Deploying to staging/production environments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Apollo GraphQL](https://www.apollographql.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)