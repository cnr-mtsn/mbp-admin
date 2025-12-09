import { gql } from '@apollo/client';

// Auth Queries
export const ME = gql`
  query Me {
    me {
      id
      email
      name
      role
    }
  }
`;

// Dashboard Queries
export const GET_DASHBOARD_ANALYTICS = gql`
  query GetDashboardAnalytics {
    dashboardAnalytics {
      total_revenue
      outstanding_balance
      overdue_balance
      in_progress_jobs_count
      pending_jobs_count
      completed_jobs_count
      open_invoices_count
      overdue_invoices_count
      paid_invoices_count
      recent_jobs {
        id
        title
        customer_id
        customer {
          id
          name
        }
        status
        total_amount
        created_at
      }
      overdue_invoices {
        id
        title
        customer_id
        customer {
          id
          name
        }
        total
        due_date
        status
      }
      recent_payments {
        id
        title
        customer_id
        customer {
          id
          name
        }
        total
        paid_date
      }
    }
  }
`;

// Customer Queries
export const GET_CUSTOMERS = gql`
  query GetCustomers($sortKey: String) {
    customers(first: 100, sortKey: $sortKey) {
      id
      name
      email
      phone
      address
      city
      state
      zip
      created_at
      open_invoice_count
      outstanding_balance
    }
  }
`;

export const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!, $jobsFirst: Int, $invoicesFirst: Int) {
    customer(id: $id) {
      id
      name
      email
      phone
      address
      city
      state
      zip
      created_at
      updated_at
      jobs(first: $jobsFirst) {
        id
        customer_id
        customer {
          id
          name
        }
        title
        description
        address
        city
        state
        total_amount
        payment_schedule
        status
        start_date
        amount_paid
        created_at
      }
      invoices(first: $invoicesFirst) {
        id
        customer_id
        job {
          id
          title
        }
        title
        description
        total
        payment_stage
        percentage
        status
        due_date
        paid_date
        created_at
      }
    }
  }
`;

// Estimate Queries
export const GET_ESTIMATES = gql`
  query GetEstimates {
    estimates {
      id
      customer_id
      customer {
        id
        name
        email
      }
      title
      description
      total
      status
      created_at
    }
  }
`;

export const GET_ESTIMATE = gql`
  query GetEstimate($id: ID!) {
    estimate(id: $id) {
      id
      customer_id
      customer {
        id
        name
        email
        phone
        address
      }
      title
      description
      line_items {
        description
        quantity
        rate
        amount
      }
      subtotal
      tax
      total
      notes
      status
      created_at
      updated_at
    }
  }
`;

// Job Queries
export const GET_JOBS = gql`
  query GetJobs($filters: JobFilters, $sortKey: String, $first: Int, $offset: Int) {
    jobs(filters: $filters, sortKey: $sortKey, first: $first, offset: $offset) {
      id
      customer_id
      customer {
        id
        name
        phone
      }
      title
      description
      total_amount
      payment_schedule
      status
      invoice_count
      paid_count
      amount_paid
      created_at
    }
  }
`;

export const GET_JOB = gql`
  query GetJob($id: ID!, $sortKey: String) {
    job(id: $id) {
      id
      customer_id
      customer {
        id
        name
        email
        phone
        address
        city
        state
        zip
      }
      estimate_id
      estimate {
        id
        title
      }
      title
      description
      address
      city
      state
      zip
      total_amount
      payment_schedule
      status
      start_date
      completion_date
      notes
      invoices(sortKey: $sortKey) {
        id
        title
        total
        payment_stage
        percentage
        status
        due_date
        paid_date
        invoice_number
      }
      invoice_count
      paid_count
      amount_paid
      created_at
      updated_at
    }
  }
`;

// Invoice Queries
export const GET_INVOICES = gql`
  query GetInvoices($first: Int, $offset: Int) {
    invoices(first: $first, offset: $offset) {
      id
      customer_id
      customer {
        id
        name
        email
      }
      job_id
      job {
        id
        title
      }
      title
      description
      total
      payment_stage
      percentage
      status
      due_date
      paid_date
      created_at
    }
  }
`;

export const GET_INVOICE = gql`
  query GetInvoice($id: ID!) {
    invoice(id: $id) {
      id
      customer_id
      customer {
        id
        name
        email
        phone
        address
      }
      job_id
      job {
        id
        title
      }
      estimate_id
      estimate {
        id
        title
      }
      invoice_number
      title
      description
      line_items {
        description
        quantity
        rate
        amount
      }
      subtotal
      tax
      total
      payment_stage
      percentage
      due_date
      paid_date
      payment_method
      notes
      status
      created_at
      updated_at
    }
  }
`;

export const GET_UNLINKED_INVOICES = gql`
  query GetUnlinkedInvoices {
    unlinkedInvoices {
      id
      customer_id
      customer {
        id
        name
      }
      invoice_number
      title
      total
      status
      created_at
    }
  }
`;

// Service Queries
export const SEARCH_SERVICES = gql`
  query SearchServices($search: String) {
    services(search: $search) {
      id
      name
      description
      cost
    }
  }
`;
