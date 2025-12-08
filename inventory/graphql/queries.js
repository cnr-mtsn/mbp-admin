import { gql } from '@apollo/client';

// ==================== AUTH QUERIES ====================

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      username
      first_name
      last_name
      name
      role
      created_at
    }
  }
`;

// ==================== PRODUCT QUERIES ====================

export const GET_ALL_PRODUCTS = gql`
  query GetAllProducts($filters: ProductFilters, $limit: Int, $offset: Int) {
    products(filters: $filters, limit: $limit, offset: $offset) {
      id
      product_type
      category
      brand
      color
      color_code
      sheen
      container_size
      amount_gallons
      attributes
      status
      depleted_at
      deleted_at
      created_at
      updated_at
      transaction_count
    }
  }
`;

export const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      product_type
      category
      brand
      color
      color_code
      sheen
      container_size
      amount_gallons
      attributes
      status
      depleted_at
      deleted_at
      created_at
      updated_at
      transaction_count
      transactions {
        id
        transaction_type
        employee_name
        amount_gallons
        notes
        created_at
      }
      last_transaction {
        id
        transaction_type
        employee_name
        amount_gallons
        created_at
      }
    }
  }
`;

export const GET_PRODUCT_BY_QR = gql`
  query GetProductByQR($qr_code: String!) {
    productByQR(qr_code: $qr_code) {
      id
      product_type
      category
      brand
      color
      color_code
      sheen
      container_size
      amount_gallons
      attributes
      status
      created_at
      updated_at
    }
  }
`;

// ==================== ANALYTICS QUERIES ====================

export const GET_INVENTORY_SUMMARY = gql`
  query GetInventorySummary {
    inventorySummary {
      total_products
      available_products
      depleted_products
      total_gallons
      products_by_type {
        product_type
        count
        total_gallons
      }
      products_by_status {
        status
        count
      }
      low_stock_products {
        id
        product_type
        brand
        color
        amount_gallons
        status
        created_at
      }
    }
  }
`;

export const GET_TRANSACTIONS = gql`
  query GetTransactions($filters: TransactionFilters, $limit: Int, $offset: Int) {
    transactions(filters: $filters, limit: $limit, offset: $offset) {
      transactions {
        id
        product_id
        product {
          id
          product_type
          brand
          color
          category
        }
        transaction_type
        employee_name
        amount_gallons
        notes
        created_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_EMPLOYEE_ACTIVITY = gql`
  query GetEmployeeActivity($start_date: String, $end_date: String) {
    employeeActivity(start_date: $start_date, end_date: $end_date) {
      employee_name
      check_ins
      check_outs
      total_transactions
      total_gallons
      last_transaction
    }
  }
`;

// ==================== ADMIN QUERIES ====================

export const GET_ALL_USERS = gql`
  query GetAllUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      id
      username
      name
      email
      first_name
      last_name
      role
      created_at
      updated_at
    }
  }
`;

export const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    user(id: $id) {
      id
      username
      name
      email
      first_name
      last_name
      role
      created_at
      updated_at
    }
  }
`;
