import { gql } from '@apollo/client';

// Auth Queries
export const ME = gql`
  query Me {
    me {
      id
      email
      name
      role
      email_verified
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
          company_name
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
          company_name
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
          company_name
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
      company_name
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
      company_name
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
          company_name
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
        customer {
          id
          name
          company_name
          email
        }
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
        company_name
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
        company_name
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
        company_name
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
      total_expenses
      net_profit
      created_at
      start_date
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
        company_name
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
        payments {
          id
          payment_method
          payment_date
          total_amount
          invoices {
            id
            invoice_id
          }
        }
      }
      payments {
        id
        payment_method
        payment_date
        total_amount
        notes
        created_at
        invoices {
          id
          amount_applied
          invoice {
            id
            invoice_number
            title
            total
            status
            payment_stage
            percentage
          }
        }
      }
      invoice_count
      paid_count
      amount_paid
      expenses {
        id
        expense_type
        vendor
        invoice_number
        invoice_date
        total
        status
      }
      total_expenses
      net_profit
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
      invoice_number
      customer {
        id
        name
        company_name
        email
      }
      job_id
      job {
        id
        title
        invoice_count
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
      payments {
        id
        payment_method
        payment_date
        total_amount
        invoices {
          id
          invoice_id
        }
      }
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
        company_name
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
      payments {
        id
        payment_method
        payment_date
        total_amount
        notes
        created_at
        invoices {
          id
          amount_applied
          invoice {
            id
            invoice_number
            title
            total
            status
            payment_stage
            percentage
          }
        }
      }
      created_at
      updated_at
    }
  }
`;

export const PREVIEW_INVOICE_EMAIL = gql`
  query PreviewInvoiceEmail($id: ID!) {
    previewInvoiceEmail(id: $id) {
      from
      to
      cc
      subject
      body
      attachmentName
    }
  }
`;

export const PREVIEW_ESTIMATE_EMAIL = gql`
  query PreviewEstimateEmail($id: ID!) {
    previewEstimateEmail(id: $id) {
      from
      to
      cc
      subject
      body
      attachmentName
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
        company_name
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

export const GET_PAYMENT = gql`
  query GetPayment($id: ID!) {
    payment(id: $id) {
      id
      customer_id
      customer {
        id
        name
        company_name
        email
      }
      payment_method
      total_amount
      payment_date
      notes
      created_at
      invoices {
        id
        amount_applied
        invoice {
          id
          invoice_number
          title
          total
          status
          payment_stage
          percentage
          job_id
          job {
            id
            title
          }
          customer_id
          customer {
            id
            name
            company_name
          }
        }
      }
    }
  }
`;

// Expense Queries
export const GET_EXPENSES = gql`
  query GetExpenses($status: String, $job_id: ID, $first: Int, $offset: Int) {
    expenses(status: $status, job_id: $job_id, first: $first, offset: $offset) {
      id
      job_id
      job {
        id
        title
      }
      expense_type
      vendor
      invoice_number
      invoice_date
      po_number
      description
      line_items {
        description
        quantity
        unit_price
        amount
      }
      subtotal
      tax
      total
      notes
      pdf_path
      status
      created_at
      updated_at
    }
  }
`;

export const GET_EXPENSE = gql`
  query GetExpense($id: ID!) {
    expense(id: $id) {
      id
      job_id
      job {
        id
        title
        customer {
          id
          name
          company_name
        }
      }
      expense_type
      vendor
      invoice_number
      invoice_date
      po_number
      description
      line_items {
        description
        quantity
        unit_price
        amount
      }
      subtotal
      tax
      total
      notes
      pdf_path
      status
      created_at
      updated_at
    }
  }
`;

export const GET_UNASSIGNED_EXPENSES = gql`
  query GetUnassignedExpenses($first: Int, $offset: Int) {
    unassignedExpenses(first: $first, offset: $offset) {
      id
      expense_type
      vendor
      invoice_number
      invoice_date
      po_number
      description
      line_items {
        description
        quantity
        unit_price
        amount
      }
      subtotal
      tax
      total
      status
      created_at
    }
  }
`;
