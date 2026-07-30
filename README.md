# Stock-Locked Store Application

A full-stack e-commerce system featuring temporary stock locking (reservations) to prevent stock conflicts and overselling during checkout. 

This project is structured as a monorepo containing a **Next.js** frontend and a **NestJS** backend utilizing **Prisma ORM** with **PostgreSQL**.

---

## Repository Structure

- `frontend/`: Next.js web application styled with TailwindCSS.
- `backend/`: NestJS REST API with Prisma and PostgreSQL integration.

---

## Features

- **Product Listing:** Real-time product inventory display.
- **Stock Reservation (Temporary Lock):** Reserve items for 5 minutes. The reserved stock is temporarily deducted from the store's inventory.
- **Reservation Timer:** Frontend countdown timer showing the remaining time to complete the transaction.
- **Automatic Stock Release:** A backend background worker automatically detects expired reservations and restores the items back to the product stock.
- **Atomic Operations:** Core actions (reserve, complete checkout, expire) are wrapped in database transactions to guarantee data consistency.

---

## Architectural Decisions

### 1. Unified Monorepo structure
Separation of concerns is maintained by using Next.js on the client and NestJS on the server. This allows frontend and backend components to scale independently and be deployed to separate hosts if necessary, while keeping development files unified.

### 2. Atomic Database Transactions (`$transaction`)
To prevent race conditions—such as two users reserving the last item at the exact same millisecond—we utilize **Prisma Transactions**. The check for available stock, the deduction of stock, and the creation of the reservation entry are executed as a single, atomic unit of work. If any step fails, the entire transaction is rolled back.

### 3. Persisted TTL with Cron Job Polling
Rather than keeping reservation timers solely in memory (which would fail if the server restarts) or setting up complex message queues, reservation expirations are saved directly to the database. A lightweight Cron job (`@nestjs/schedule`) polls the database every 10 seconds for pending reservations whose `expiresAt` is in the past, and returns the stock back to the inventory in a safe transaction block.

---

## Assumptions Made

- **User Accounts:** In the absence of a full user login system, the frontend assumes a single-user checkout session. Only one reservation can be active per client session.
- **Lock Duration:** We assume a standard checkout lock duration of **5 minutes** is sufficient for a customer to complete a payment process.
- **Client Synchronization:** The frontend polls the backend `/products` API every 5 seconds to ensure changes made by other users (or automated releases) are quickly reflected.

---

## Trade-offs Considered

### Polling via Cron vs. Redis TTL / Message Queue
- **Decision:** Use a database-persisted timestamp and query via Cron.
- **Pros:** Stateless server, extremely durable across restarts, zero additional infrastructure dependencies (no Redis/RabbitMQ setup required).
- **Cons:** Triggers database queries every 10 seconds. Under heavy load, this polling queries Postgres frequently. For large-scale applications, using a Redis-backed queue or event broker (like RabbitMQ) with delayed messages would be more performant but complex.

### Client-Side HTTP Polling vs. WebSockets / SSE
- **Decision:** Use client-side API polling (every 5 seconds).
- **Pros:** Simpler frontend/backend code, stateless connections, works perfectly over serverless environments without keeping open TCP connections.
- **Cons:** Introduces minor delays in showing updated stock to users and adds network overhead from constant requests. WebSockets or Server-Sent Events (SSE) would provide instant updates but increase connection states on the server.

---

## Improvements with More Time

1. **Authentication & Authorization:**
   - Integrate JWT authentication and user roles to manage private shopping baskets, multiple profiles, and secure checkout endpoints.
2. **WebSocket Real-time Updates:**
   - Implement NestJS Gateways (WebSockets) to push stock updates to all connected clients immediately when a reservation or sale occurs.
3. **Redis Keyspace Notifications / Message Broker:**
   - Switch to Redis for managing temporary reservation tokens. Use Redis TTL events to trigger automated stock replenishment, removing the periodic Cron database queries.
4. **Enhanced Concurrency Testing:**
   - Write load and stress tests (using tools like K6) to simulate high concurrent checkouts and verify database transaction limits under heavy loads.
5. **Real Payment Gateway Integration:**
   - Replace the mock payment PATCH request with a secure checkout flow using Stripe or similar SDKs.

---

## Setup & Running the Application

### Prerequisites

- Node.js (v18+)
- PostgreSQL (or an equivalent Prisma-compatible database)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/ITSDeniz/sales-app.git
   cd sales-app
   ```

2. Configure environment variables inside `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/sales_app"
   ```

3. Setup Backend:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

4. Setup Frontend:
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

- **Backend (Port 3000):**
  ```bash
  cd backend
  npm run start:dev
  ```

- **Frontend (Port 3001):**
  ```bash
  cd frontend
  npm run dev
  ```
