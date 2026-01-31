import gql from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    username: String!
    first_name: String
    last_name: String
    name: String!
    role: String!
    email_verified: Boolean!
    created_at: String!
    updated_at: String
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type Customer {
    id: ID!
    name: String!
    company_name: String
    email: String
    phone: String
    address: String
    city: String
    state: String
    zip: String
    created_at: String!
    updated_at: String!
    invoices(first: Int): [Invoice!]
    jobs(first: Int): [Job!]
    open_invoice_count: Int
    outstanding_balance: Float
  }

  type Estimate {
    id: ID!
    customer_id: ID!
    customer: Customer
    title: String!
    description: String
    line_items: [LineItem!]
    subtotal: Float
    tax: Float
    total: Float!
    notes: String
    status: String!
    created_at: String!
    updated_at: String!
    activity_logs: [ActivityLog!]
  }

  type Job {
    id: ID!
    customer_id: ID!
    customer: Customer
    estimate_id: ID
    estimate: Estimate
    title: String!
    description: String
    address: String
    city: String
    state: String
    zip: String
    total_amount: Float!
    payment_schedule: String!
    status: String!
    start_date: String
    completion_date: String
    notes: String
    invoices(sortKey: String): [Invoice!]
    invoice_count: Int
    paid_count: Int
    amount_paid: Float
    payments: [Payment!]!
    expenses: [Expense!]
    total_expenses: Float
    net_profit: Float
    created_at: String!
    updated_at: String!
  }

  type EmailPreview {
    from: String!
    to: String!
    cc: [String!]!
    subject: String!
    body: String!
    attachmentName: String!
  }

  type ActivityLog {
    id: ID!
    entity_type: String!
    entity_id: ID!
    activity_type: String!
    user_id: ID
    user_name: String
    metadata: JSON
    created_at: String!
  }

  type Invoice {
    id: ID!
    customer_id: ID!
    customer: Customer
    job_id: ID
    job: Job
    estimate_id: ID
    estimate: Estimate
    invoice_number: String
    title: String!
    description: String
    line_items: [LineItem!]
    subtotal: Float
    tax: Float
    total: Float!
    payment_stage: String
    percentage: Int
    due_date: String
    paid_date: String
    payment_method: String
    notes: String
    status: String!
    payments: [Payment!]!
    created_at: String!
    updated_at: String!
    activity_logs: [ActivityLog!]
  }

  type Payment {
    id: ID!
    customer_id: ID!
    customer: Customer
    payment_method: String!
    total_amount: Float!
    payment_date: String!
    notes: String
    invoices: [PaymentInvoice!]!
    created_at: String!
    updated_at: String!
  }

  type PaymentInvoice {
    id: ID!
    payment_id: ID!
    invoice_id: ID!
    invoice: Invoice
    amount_applied: Float!
    created_at: String!
  }

  type Expense {
    id: ID!
    job_id: ID
    job: Job
    expense_type: String!
    vendor: String
    invoice_number: String
    invoice_date: String
    po_number: String
    description: String
    line_items: [ExpenseLineItem!]
    subtotal: Float
    tax: Float
    total: Float!
    notes: String
    pdf_path: String
    status: String!
    created_at: String!
    updated_at: String!
  }

  type ExpenseLineItem {
    description: String!
    quantity: Float
    unit_price: Float
    amount: Float!
  }

  type Service {
    id: ID!
    name: String!
    description: String
    cost: Float!
    created_at: String!
    updated_at: String!
  }

  type LineItem {
    description: String!
    quantity: Float!
    rate: Float!
    amount: Float!
  }

  input LineItemInput {
    description: String!
    quantity: Float!
    rate: Float!
    amount: Float!
  }

  input LineItemJobInput {
    name: String!
    description: String
    quantity: Float!
    rate: Float!
    amount: Float!
  }

  # Inventory Types
  type Product {
    id: ID!
    product_type: String!
    category: String
    brand: String
    color: String
    color_code: String
    sheen: String
    container_size: String
    amount_gallons: Float!
    attributes: JSON
    status: String!
    depleted_at: String
    deleted_at: String
    created_at: String!
    updated_at: String!
    transactions: [Transaction!]
    transaction_count: Int
    last_transaction: Transaction
  }

  type Transaction {
    id: ID!
    product_id: ID!
    product: Product
    transaction_type: String!
    employee_name: String!
    amount_gallons: Float!
    notes: String
    created_at: String!
  }

  type InventorySummary {
    total_products: Int!
    available_products: Int!
    depleted_products: Int!
    total_gallons: Float!
    products_by_type: [ProductTypeCount!]!
    products_by_status: [ProductStatusCount!]!
    low_stock_products: [Product!]!
  }

  type ProductTypeCount {
    product_type: String!
    count: Int!
    total_gallons: Float!
  }

  type ProductStatusCount {
    status: String!
    count: Int!
  }

  type TransactionHistoryResult {
    transactions: [TransactionWithProduct!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  type TransactionWithProduct {
    id: ID!
    product_id: ID!
    product: Product!
    transaction_type: String!
    employee_name: String!
    amount_gallons: Float!
    notes: String
    created_at: String!
  }

  type EmployeeActivity {
    employee_name: String!
    check_ins: Int!
    check_outs: Int!
    total_transactions: Int!
    total_gallons: Float!
    last_transaction: String
  }

  # JSON scalar type for flexible attributes
  scalar JSON

  # Inventory Input Types
  input ProductInput {
    product_type: String!
    category: String
    brand: String
    color: String
    color_code: String
    sheen: String
    container_size: String
    amount_gallons: Float
    attributes: JSON
    status: String
  }

  input ProductUpdateInput {
    product_type: String
    category: String
    brand: String
    color: String
    color_code: String
    sheen: String
    container_size: String
    amount_gallons: Float
    attributes: JSON
    status: String
  }

  input TransactionInput {
    product_id: ID!
    transaction_type: String!
    employee_name: String!
    amount_gallons: Float!
    notes: String
  }

  input TransactionFilters {
    start_date: String
    end_date: String
    employee_name: String
    transaction_type: String
    product_id: ID
  }

  input ProductFilters {
    product_type: String
    category: String
    brand: String
    color: String
    status: String
    search: String
  }

  input JobFilters {
    status: String
    customer_id: ID
    payment_schedule: String
    search: String
  }

  input CustomerInput {
    name: String!
    company_name: String
    email: String
    phone: String
    address: String
    city: String
    state: String
    zip: String
  }

  input EstimateInput {
    customer_id: ID!
    title: String!
    description: String
    line_items: [LineItemInput!]
    subtotal: Float
    tax: Float
    total: Float!
    notes: String
    status: String
  }

  input EstimateUpdateInput {
    customer_id: ID
    title: String
    description: String
    line_items: [LineItemInput!]
    subtotal: Float
    tax: Float
    total: Float
    notes: String
    status: String
  }

  input JobInput {
    customer_id: ID!
    estimate_id: ID
    title: String!
    description: String
    address: String
    city: String
    state: String
    zip: String
    total_amount: Float!
    payment_schedule: String
    start_date: String
    notes: String
    invoice_ids: [ID!]
    line_items: [LineItemJobInput!]
  }

  input JobUpdateInput {
    customer_id: ID
    estimate_id: ID
    title: String
    description: String
    address: String
    city: String
    state: String
    zip: String
    total_amount: Float
    payment_schedule: String
    status: String
    start_date: String
    completion_date: String
    notes: String
  }

  input InvoiceInput {
    customer_id: ID!
    job_id: ID
    estimate_id: ID
    title: String!
    description: String
    line_items: [LineItemInput!]
    subtotal: Float
    tax: Float
    total: Float!
    payment_stage: String
    percentage: Int
    due_date: String
    notes: String
    status: String
  }

  input InvoiceUpdateInput {
    customer_id: ID
    job_id: ID
    estimate_id: ID
    title: String
    description: String
    line_items: [LineItemInput!]
    subtotal: Float
    tax: Float
    total: Float
    payment_stage: String
    percentage: Int
    due_date: String
    paid_date: String
    payment_method: String
    notes: String
    status: String
  }

  input UserUpdateInput {
    email: String
    username: String
    first_name: String
    last_name: String
    role: String
  }

  input PaymentInvoiceInput {
    invoice_id: ID!
    amount_applied: Float!
  }

  input RecordPaymentInput {
    customer_id: ID!
    payment_method: String!
    total_amount: Float!
    payment_date: String
    notes: String
    invoices: [PaymentInvoiceInput!]!
  }

  input PaymentUpdateInput {
    payment_method: String
    payment_date: String
    notes: String
  }

  input ExpenseLineItemInput {
    description: String!
    quantity: Float
    unit_price: Float
    amount: Float!
  }

  input CreateExpenseInput {
    job_id: ID
    expense_type: String!
    vendor: String
    invoice_number: String
    invoice_date: String
    po_number: String
    description: String
    line_items: [ExpenseLineItemInput!]
    subtotal: Float
    tax: Float
    total: Float!
    notes: String
    pdf_path: String
    status: String
  }

  input UpdateExpenseInput {
    job_id: ID
    expense_type: String
    vendor: String
    invoice_number: String
    invoice_date: String
    po_number: String
    description: String
    line_items: [ExpenseLineItemInput!]
    subtotal: Float
    tax: Float
    total: Float
    notes: String
    status: String
  }

  type DashboardAnalytics {
    total_revenue: Float!
    outstanding_balance: Float!
    overdue_balance: Float!
    in_progress_jobs_count: Int!
    pending_jobs_count: Int!
    completed_jobs_count: Int!
    open_invoices_count: Int!
    overdue_invoices_count: Int!
    paid_invoices_count: Int!
    recent_jobs: [Job!]!
    overdue_invoices: [Invoice!]!
    recent_payments: [Invoice!]!
  }

  type Query {
    # Auth
    me: User

    # Dashboard
    dashboardAnalytics: DashboardAnalytics!

    # Users (admin)
    users(limit: Int, offset: Int): [User!]!
    user(id: ID!): User

    # Customers
    customers(first: Int!, sortKey: String): [Customer!]!
    customer(id: ID!): Customer

    # Estimates
    estimates: [Estimate!]!
    estimate(id: ID!): Estimate
    previewEstimateEmail(id: ID!): EmailPreview!

    # Jobs
    jobs(filters: JobFilters, sortKey: String, first: Int, offset: Int): [Job!]!
    job(id: ID!): Job

    # Invoices
    invoices(first: Int, offset: Int): [Invoice!]!
    invoice(id: ID!): Invoice
    unlinkedInvoices: [Invoice!]!
    previewInvoiceEmail(id: ID!): EmailPreview!
    searchInvoices(invoiceNumber: String, email: String, name: String): [Invoice!]!

    # Payments
    payments(customer_id: ID, job_id: ID, invoice_id: ID): [Payment!]!
    payment(id: ID!): Payment

    # Services
    services(search: String): [Service!]!
    service(id: ID!): Service

    # Expenses
    expenses(status: String, job_id: ID, first: Int, offset: Int): [Expense!]!
    expense(id: ID!): Expense
    unassignedExpenses(first: Int, offset: Int): [Expense!]!

    # Inventory - Products
    products(filters: ProductFilters, limit: Int, offset: Int): [Product!]!
    product(id: ID!): Product
    productByQR(qr_code: String!): Product

    # Inventory - Transactions
    transactions(filters: TransactionFilters, limit: Int, offset: Int): TransactionHistoryResult!
    transaction(id: ID!): Transaction

    # Inventory - Analytics
    inventorySummary: InventorySummary!
    employeeActivity(start_date: String, end_date: String): [EmployeeActivity!]!
  }

  type Mutation {
    # Auth
    register(email: String!, password: String!, name: String!): AuthPayload!
    login(username: String!, password: String!): AuthPayload!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!
    sendVerificationEmail: Boolean!
    verifyEmail(token: String!): Boolean!

    # Users (admin)
    updateUser(id: ID!, input: UserUpdateInput!): User!
    deleteUser(id: ID!): Boolean!

    # Customers
    createCustomer(input: CustomerInput!): Customer!
    updateCustomer(id: ID!, input: CustomerInput!): Customer!
    deleteCustomer(id: ID!): Boolean!

    # Estimates
    createEstimate(input: EstimateInput!): Estimate!
    updateEstimate(id: ID!, input: EstimateUpdateInput!): Estimate!
    deleteEstimate(id: ID!): Boolean!
    sendEstimate(id: ID!, recipientEmail: String, ccEmails: [String!], subject: String, body: String): Boolean!
    acceptEstimate(id: ID!, payment_schedule: String!): Job!

    # Jobs
    createJob(input: JobInput!): Job!
    updateJob(id: ID!, input: JobUpdateInput!): Job!
    deleteJob(id: ID!): Boolean!
    linkInvoicesToJob(job_id: ID!, invoice_ids: [ID!]!): Job!

    # Invoices
    createInvoice(input: InvoiceInput!): Invoice!
    updateInvoice(id: ID!, input: InvoiceUpdateInput!): Invoice!
    deleteInvoice(id: ID!): Boolean!
    sendInvoice(id: ID!, recipientEmail: String, ccEmails: [String!], subject: String, body: String): Boolean!

    # Payments
    recordPayment(input: RecordPaymentInput!): Payment!
    updatePayment(id: ID!, input: PaymentUpdateInput!): Payment!
    deletePayment(id: ID!): Boolean!

    # Expenses
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(id: ID!, input: UpdateExpenseInput!): Expense!
    assignExpenseToJob(expense_id: ID!, job_id: ID!): Expense!
    deleteExpense(id: ID!): Boolean!

    # Inventory - Products
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductUpdateInput!): Product!
    deleteProduct(id: ID!): Boolean!
    restoreProduct(id: ID!): Product!
    depleteProduct(id: ID!): Product!

    # Inventory - Transactions
    createTransaction(input: TransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
  }
`;
