import { gql } from '@apollo/client';

// ==================== AUTH MUTATIONS ====================

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      user {
        id
        email
        username
        first_name
        last_name
        name
        role
        created_at
      }
      token
    }
  }
`;

export const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      user {
        id
        email
        username
        first_name
        last_name
        name
        role
        created_at
      }
      token
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      username
      first_name
      last_name
      name
      role
      created_at
      updated_at
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

// ==================== PRODUCT MUTATIONS ====================

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
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

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: ProductUpdateInput!) {
    updateProduct(id: $id, input: $input) {
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
      updated_at
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

export const RESTORE_PRODUCT = gql`
  mutation RestoreProduct($id: ID!) {
    restoreProduct(id: $id) {
      id
      status
      deleted_at
    }
  }
`;

export const DEPLETE_PRODUCT = gql`
  mutation DepleteProduct($id: ID!) {
    depleteProduct(id: $id) {
      id
      status
      depleted_at
    }
  }
`;

// ==================== TRANSACTION MUTATIONS ====================

export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: TransactionInput!) {
    createTransaction(input: $input) {
      id
      product_id
      transaction_type
      employee_name
      amount_gallons
      notes
      created_at
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;
