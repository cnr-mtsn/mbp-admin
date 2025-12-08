# Painting Company Manager

A comprehensive application to manage customers, estimates, jobs, and invoices for your painting company. Built with GraphQL to replace expensive tools like QuickBooks with a customized solution tailored to your 50%/40%/10% payment schedule.

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Apollo Server** with **GraphQL**
- **PostgreSQL** database (shared with inventory app)
- **JWT** authentication
- **bcryptjs** for password hashing

### Frontend
- **Next.js 14** with React 18 (App Router)
- **Apollo Client** for GraphQL queries/mutations
- **Tailwind CSS** for styling

## Key Features

### Payment Schedule Management
- **Jobs-based workflow**: Create jobs that automatically generate invoices based on your payment schedule
- **Flexible payment stages**: Default 50/40/10 schedule (customizable)
  - 50% - Initial payment at job start
  - 40% - Second payment when painting is complete
  - 10% - Final payment after touch-ups
- **Track payment progress**: See which invoices are paid and outstanding for each job

### Core Functionality
- **Customer Management**: Store customer contact and address information
- **Estimates**: Create detailed estimates with line items
- **Jobs**: Convert estimates to jobs with automatic invoice generation
- **Invoices**: Track invoices by payment stage with due dates and payment methods
- **Authentication**: Secure user authentication with JWT tokens

## Project Structure

```
billing/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── graphql/
│   │   ├── schema/
│   │   │   └── typeDefs.js
│   │   └── resolvers/
│   │       ├── index.js
│   │       ├── auth.js
│   │       ├── customers.js
│   │       ├── estimates.js
│   │       ├── jobs.js
│   │       └── invoices.js
│   ├── middleware/
│   │   └── auth.js
│   ├── scripts/
│   │   └── migrate.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── customers/
│   │   ├── estimates/
│   │   ├── jobs/
│   │   ├── invoices/
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── globals.css
│   ├── lib/
│   │   ├── apolloClient.js
│   │   └── graphql/
│   │       ├── queries.js
│   │       └── mutations.js
│   └── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

Installs: Express, Apollo Server, GraphQL, PostgreSQL client, JWT, bcryptjs, and more.

#### Frontend
```bash
cd frontend
npm install
```

Installs: Next.js, React, Apollo Client, GraphQL, Tailwind CSS, and more.

### 2. Configure Environment Variables

#### Backend
Copy `.env.example` to `.env` and update with your database credentials:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=3001
NODE_ENV=development

# Use the same database as your inventory app
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_SSL=false

# Generate a secure random string for JWT_SECRET
JWT_SECRET=your_secure_jwt_secret_here

FRONTEND_URL=http://localhost:5174
```

#### Frontend
Copy `.env.local.example` to `.env.local`:
```bash
cd frontend
cp .env.local.example .env.local
```

Update the GraphQL endpoint:
```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
```

### 3. Run Database Migrations

Create the necessary tables in your PostgreSQL database:
```bash
cd backend
npm run migrate
```

This creates the following tables:
- **users** - User authentication with roles
- **customers** - Customer contact and address information
- **estimates** - Project estimates with line items (JSONB)
- **jobs** - Project jobs with payment schedules
- **invoices** - Invoices linked to jobs with payment stages

### 4. Start the Applications

#### Backend (Terminal 1)
```bash
cd backend
npm run dev
```
- Runs on: **http://localhost:3001**
- GraphQL endpoint: **http://localhost:3001/graphql**
- GraphQL Playground: Visit the endpoint in your browser for interactive API testing

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
- Runs on: **http://localhost:5174**

### 5. Create Your First User

You'll need to create a user account. You can use the GraphQL Playground at http://localhost:3001/graphql:

```graphql
mutation {
  register(
    email: "your@email.com"
    password: "your_password"
    name: "Your Name"
  ) {
    user {
      id
      email
      name
    }
    token
  }
}
```

Or use the frontend registration flow (if you add a registration page to the UI).

## Database Schema

### Jobs Table
The jobs table is the centerpiece of the payment workflow:
- **customer_id**: Links to customer
- **estimate_id**: Optional link to original estimate
- **total_amount**: Total project cost
- **payment_schedule**: e.g., "50/40/10" (customizable)
- **status**: pending, active, completed, cancelled
- **start_date** / **completion_date**: Track project timeline

When you create a job, it automatically generates invoices based on the payment schedule.

### Invoices Table
Invoices are linked to jobs and track individual payment stages:
- **job_id**: Links to parent job
- **payment_stage**: start, completion, touchup
- **percentage**: Payment percentage (50, 40, 10, etc.)
- **status**: unpaid, paid, overdue
- **due_date** / **paid_date**: Track payment timeline
- **payment_method**: Track how customer paid (check, card, etc.)

## GraphQL API

### Example Queries

#### Get all jobs with payment status
```graphql
query {
  jobs {
    id
    title
    customer {
      name
      phone
    }
    total_amount
    payment_schedule
    invoice_count
    paid_count
    amount_paid
    status
  }
}
```

#### Get job details with invoices
```graphql
query {
  job(id: "1") {
    title
    total_amount
    invoices {
      id
      title
      total
      payment_stage
      percentage
      status
      due_date
    }
  }
}
```

### Example Mutations

#### Create a job (auto-generates invoices)
```graphql
mutation {
  createJob(input: {
    customer_id: 1
    title: "Exterior House Painting"
    description: "Full exterior repaint"
    address: "123 Main St"
    city: "Portland"
    state: "OR"
    zip: "97201"
    total_amount: 10000
    payment_schedule: "50/40/10"
    start_date: "2025-01-15"
  }) {
    id
    title
    payment_schedule
  }
}
```

This automatically creates 3 invoices:
- Invoice 1: $5,000 (50%) - Job start
- Invoice 2: $4,000 (40%) - Painting completion
- Invoice 3: $1,000 (10%) - After touch-ups

#### Mark invoice as paid
```graphql
mutation {
  updateInvoice(id: "1", input: {
    status: "paid"
    paid_date: "2025-01-15"
    payment_method: "check"
  }) {
    id
    status
    paid_date
  }
}
```

## Workflow

### Typical Project Flow

1. **Create Customer** - Add customer contact info
2. **Create Estimate** (optional) - Build detailed estimate with line items
3. **Create Job** - Convert estimate to job or create new job
   - Specify payment schedule (default: 50/40/10)
   - System auto-creates 3 invoices
4. **Track Payments** - Mark invoices as paid when payment received
5. **Monitor Progress** - View job dashboard to see payment status

### Payment Schedule Flexibility

You can customize the payment schedule when creating a job:
- Standard: "50/40/10" (3 payments)
- Deposit + Balance: "30/70" (2 payments)
- Equal thirds: "33/33/34" (3 payments)
- Custom: Any breakdown you prefer

The system automatically calculates invoice amounts and creates the appropriate number of invoices.

## Development Notes

- Backend runs on port **3001** (inventory app uses 3000)
- Frontend runs on port **5174** (inventory app uses 5173)
- Both apps share the same PostgreSQL database but use separate tables
- GraphQL provides a single endpoint for all data operations
- Authentication uses JWT tokens stored in localStorage
- Use GraphQL Playground at http://localhost:3001/graphql for API testing

## Next Steps

Additional features you can add:
- PDF generation for estimates and invoices
- Email notifications for due invoices
- Automated payment reminders
- Customer portal to view invoices
- Photo uploads for project documentation
- Material cost tracking per job
- Labor hour tracking
- Dashboard analytics (revenue, outstanding payments, etc.)
- Invoice numbering system
- Tax calculation by location
- Multi-user support with permissions

## GraphQL Benefits

Using GraphQL provides several advantages:
- **Flexible queries**: Request exactly the data you need
- **Reduced over-fetching**: No unnecessary data transfer
- **Strong typing**: Auto-generated TypeScript types
- **Single endpoint**: All operations through `/graphql`
- **Self-documenting**: GraphQL Playground provides interactive docs
- **Efficient relationships**: Easily fetch related data (jobs + invoices + customers)

## Troubleshooting

### Backend won't start
- Check that PostgreSQL is running
- Verify database credentials in `.env`
- Ensure migrations have been run
- Check that port 3001 is available

### Frontend can't connect
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_GRAPHQL_URL` in `.env.local`
- Open browser console for GraphQL errors
- Test GraphQL endpoint directly at http://localhost:3001/graphql

### GraphQL errors
- Check authentication token in browser localStorage
- Verify query/mutation syntax in GraphQL Playground
- Check server logs for detailed error messages
- Ensure required fields are provided in mutations
