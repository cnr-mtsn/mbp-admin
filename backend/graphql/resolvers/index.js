import { GraphQLJSON } from 'graphql-type-json';
import { authResolvers } from './auth.js';
import { customerResolvers } from './customers.js';
import { estimateResolvers } from './estimates.js';
import { jobResolvers } from './jobs.js';
import { invoiceResolvers } from './invoices.js';
import { serviceResolvers } from './services.js';
import { productResolvers } from './products.js';
import { transactionResolvers } from './transactions.js';
import { analyticsResolvers } from './analytics.js';
import { userResolvers } from './users.js';
import { dashboardResolvers } from './dashboard.js';
import { paymentResolvers } from './payments.js';
import { expenseResolvers } from './expenses.js';

export const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    ...authResolvers.Query,
    ...userResolvers.Query,
    ...customerResolvers.Query,
    ...estimateResolvers.Query,
    ...jobResolvers.Query,
    ...invoiceResolvers.Query,
    ...serviceResolvers.Query,
    ...productResolvers.Query,
    ...transactionResolvers.Query,
    ...analyticsResolvers.Query,
    ...dashboardResolvers.Query,
    ...paymentResolvers.Query,
    ...expenseResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...customerResolvers.Mutation,
    ...estimateResolvers.Mutation,
    ...jobResolvers.Mutation,
    ...invoiceResolvers.Mutation,
    ...productResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...paymentResolvers.Mutation,
    ...expenseResolvers.Mutation,
  },
  Customer: customerResolvers.Customer,
  Job: {
    ...jobResolvers.Job,
    ...expenseResolvers.Job,
  },
  Invoice: invoiceResolvers.Invoice,
  Estimate: estimateResolvers.Estimate,
  Product: productResolvers.Product,
  Transaction: transactionResolvers.Transaction,
  TransactionWithProduct: transactionResolvers.TransactionWithProduct,
  Payment: paymentResolvers.Payment,
  Expense: expenseResolvers.Expense,
};
