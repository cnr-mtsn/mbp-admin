import { gql } from '@apollo/client';

// Auth Mutations
export const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      user {
        id
        email
        name
        role
      }
      token
    }
  }
`;

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      user {
        id
        email
        name
        role
      }
      token
    }
  }
`;

// Customer Mutations
export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      phone
      address
      city
      state
      zip
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: CustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      email
      phone
      address
      city
      state
      zip
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

// Estimate Mutations
export const CREATE_ESTIMATE = gql`
  mutation CreateEstimate($input: EstimateInput!) {
    createEstimate(input: $input) {
      id
      title
      total
      status
    }
  }
`;

export const UPDATE_ESTIMATE = gql`
  mutation UpdateEstimate($id: ID!, $input: EstimateInput!) {
    updateEstimate(id: $id, input: $input) {
      id
      title
      total
      status
    }
  }
`;

export const DELETE_ESTIMATE = gql`
  mutation DeleteEstimate($id: ID!) {
    deleteEstimate(id: $id)
  }
`;

export const ACCEPT_ESTIMATE = gql`
  mutation AcceptEstimate($id: ID!, $payment_schedule: String!) {
    acceptEstimate(id: $id, payment_schedule: $payment_schedule) {
      id
      title
      total_amount
      payment_schedule
      status
      customer_id
      estimate_id
    }
  }
`;

// Job Mutations
export const CREATE_JOB = gql`
  mutation CreateJob($input: JobInput!) {
    createJob(input: $input) {
      id
      title
      total_amount
      payment_schedule
      status
    }
  }
`;

export const UPDATE_JOB = gql`
  mutation UpdateJob($id: ID!, $input: JobUpdateInput!) {
    updateJob(id: $id, input: $input) {
      id
      title
      total_amount
      status
    }
  }
`;

export const DELETE_JOB = gql`
  mutation DeleteJob($id: ID!) {
    deleteJob(id: $id)
  }
`;

export const LINK_INVOICES_TO_JOB = gql`
  mutation LinkInvoicesToJob($job_id: ID!, $invoice_ids: [ID!]!) {
    linkInvoicesToJob(job_id: $job_id, invoice_ids: $invoice_ids) {
      id
      title
      invoice_count
      invoices {
        id
        title
        total
        status
      }
    }
  }
`;

// Invoice Mutations
export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: InvoiceInput!) {
    createInvoice(input: $input) {
      id
      title
      total
      status
    }
  }
`;

export const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: ID!, $input: InvoiceUpdateInput!) {
    updateInvoice(id: $id, input: $input) {
      id
      title
      total
      status
      due_date
      paid_date
    }
  }
`;

export const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`;

export const SEND_INVOICE = gql`
  mutation SendInvoice($id: ID!, $recipientEmail: String, $ccEmails: [String!], $subject: String, $body: String) {
    sendInvoice(id: $id, recipientEmail: $recipientEmail, ccEmails: $ccEmails, subject: $subject, body: $body)
  }
`;

// Payment Mutations
export const UPDATE_PAYMENT = gql`
  mutation UpdatePayment($id: ID!, $input: PaymentUpdateInput!) {
    updatePayment(id: $id, input: $input) {
      id
      payment_method
      payment_date
      total_amount
      notes
    }
  }
`;

export const DELETE_PAYMENT = gql`
  mutation DeletePayment($id: ID!) {
    deletePayment(id: $id)
  }
`;

// Expense Mutations
export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
      expense_type
      vendor
      invoice_number
      total
      status
    }
  }
`;

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: ID!, $input: UpdateExpenseInput!) {
    updateExpense(id: $id, input: $input) {
      id
      job_id
      expense_type
      vendor
      invoice_number
      total
      status
    }
  }
`;

export const ASSIGN_EXPENSE_TO_JOB = gql`
  mutation AssignExpenseToJob($expense_id: ID!, $job_id: ID!) {
    assignExpenseToJob(expense_id: $expense_id, job_id: $job_id) {
      id
      job_id
      status
    }
  }
`;

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($id: ID!) {
    deleteExpense(id: $id)
  }
`;
