import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid, toGid } from '../../utils/gid.js';
import { fetchPaymentsWithInvoices } from './payments.js';
import { cachedResolver, invalidateCache, generateListTags } from '../../utils/cachedResolver.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const jobResolvers = {
  Query: {
    jobs: cachedResolver(
      async (_, { filters, sortKey = 'created_at', first, offset }, { user }) => {
        requireAuth(user);

        // Build WHERE clause based on filters
        const whereClauses = [];
        const queryParams = [];
        let paramCount = 0;

        if (filters?.status) {
          paramCount++;
          whereClauses.push(`j.status = $${paramCount}`);
          queryParams.push(filters.status);
        }

        if (filters?.customer_id) {
          paramCount++;
          const customerHexPrefix = extractUuid(filters.customer_id);
          whereClauses.push(`REPLACE(j.customer_id::text, '-', '') LIKE $${paramCount}`);
          queryParams.push(`${customerHexPrefix}%`);
        }

        if (filters?.payment_schedule) {
          paramCount++;
          whereClauses.push(`j.payment_schedule = $${paramCount}`);
          queryParams.push(filters.payment_schedule);
        }

        if (filters?.search) {
          paramCount++;
          whereClauses.push(`(j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`);
          queryParams.push(`%${filters.search}%`);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Build ORDER BY clause based on sortKey
        let orderBy;
        switch (sortKey) {
          case 'title':
            orderBy = 'j.title ASC';
            break;
          case 'customer':
            orderBy = 'j.customer_id ASC';
            break;
          case 'total_amount':
            orderBy = 'j.total_amount DESC NULLS LAST';
            break;
          case 'status':
            orderBy = `CASE j.status
                        WHEN 'in_progress' THEN 1
                        WHEN 'pending' THEN 2
                        WHEN 'completed' THEN 3
                        WHEN 'paid' THEN 4
                        ELSE 5
                      END, j.created_at DESC`;
            break;
          case 'created_at':
          default:
            orderBy = 'j.created_at DESC';
        }

        // Add LIMIT and OFFSET if provided
        let limitOffsetClause = '';
        if (first) {
          paramCount++;
          limitOffsetClause += `LIMIT $${paramCount}`;
          queryParams.push(first);
        }
        if (offset) {
          paramCount++;
          limitOffsetClause += ` OFFSET $${paramCount}`;
          queryParams.push(offset);
        }

        const result = await query(
          `SELECT j.*,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
                  (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
           FROM jobs j
           ${whereClause}
           ORDER BY ${orderBy}
           ${limitOffsetClause}`,
          queryParams
        );
        return toGidFormatArray(result.rows, 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
      },
      {
        operationName: 'jobs',
        getTags: (args, result) => generateListTags('job', args.filters, result),
        ttl: 300000, // 5 minutes
      }
    ),

    job: cachedResolver(
      async (_, { id }, { user }) => {
        requireAuth(user);
        const hexPrefix = extractUuid(id);
        const result = await query(
          `SELECT j.*,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
                  (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
           FROM jobs j
           WHERE REPLACE(j.id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );

        if (result.rows.length === 0) {
          throw new Error('Job not found');
        }

        return toGidFormat(result.rows[0], 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
      },
      {
        operationName: 'job',
        getTags: (args, result) => [
          `job:${result.id}`,
          `job:customer:${result.customer_id}`,
        ],
        ttl: 300000, // 5 minutes
      }
    ),
  },

  Job: {
    customer: cachedResolver(
      async (parent) => {
        const hexPrefix = extractUuid(parent.customer_id);
        const result = await query(
          `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
        return toGidFormat(result.rows[0], 'Customer');
      },
      {
        operationName: 'Job.customer',
        getKey: (parent) => ({ customer_id: parent.customer_id }),
        getTags: (args, result) => [`customer:${result.id}`],
        ttl: 600000, // 10 minutes
      }
    ),

    estimate: cachedResolver(
      async (parent) => {
        if (!parent.estimate_id) return null;
        const hexPrefix = extractUuid(parent.estimate_id);
        const result = await query(
          `SELECT * FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
        return toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
      },
      {
        operationName: 'Job.estimate',
        getKey: (parent) => ({ estimate_id: parent.estimate_id }),
        getTags: (args, result) => result ? [`estimate:${result.id}`] : [],
        ttl: 300000, // 5 minutes
      }
    ),

    invoices: async (parent, { sortKey = 'invoice_number' }) => {
      const hexPrefix = extractUuid(parent.id);

      // Build ORDER BY clause based on sortKey
      let orderBy;
      switch (sortKey) {
        case 'invoice_number':
          orderBy = `CASE WHEN invoice_number ~ '^[0-9]+$'
                          THEN CAST(invoice_number AS INTEGER)
                          ELSE 999999
                     END,
                     invoice_number NULLS LAST,
                     created_at`;
          break;
        case 'total':
          orderBy = 'total DESC NULLS LAST, created_at';
          break;
        case 'status':
          orderBy = 'status, created_at';
          break;
        case 'due_date':
          orderBy = 'due_date NULLS LAST, created_at';
          break;
        case 'created_at':
          orderBy = 'created_at DESC';
          break;
        case 'payment_stage':
          orderBy = `CASE payment_stage
                       WHEN 'start' THEN 1
                       WHEN 'completion' THEN 2
                       WHEN 'touchup' THEN 3
                       ELSE 4
                     END,
                     created_at`;
          break;
        default:
          // Default to invoice_number if invalid sortKey provided
          orderBy = `CASE WHEN invoice_number ~ '^[0-9]+$'
                          THEN CAST(invoice_number AS INTEGER)
                          ELSE 999999
                     END,
                     invoice_number NULLS LAST,
                     created_at`;
      }

      const result = await query(
        `SELECT * FROM invoices
         WHERE REPLACE(job_id::text, '-', '') LIKE $1
         ORDER BY ${orderBy}`,
        [`${hexPrefix}%`]
      );

      return toGidFormatArray(result.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
        ...row,
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
      }));
    },

    payments: async (parent) => {
      return fetchPaymentsWithInvoices({ jobId: parent.id });
    },
  },

  Mutation: {
    createJob: async (_, { input }, { user }) => {
      requireAuth(user);
      const {
        customer_id,
        estimate_id,
        title,
        description,
        address,
        city,
        state,
        zip,
        total_amount,
        payment_schedule,
        start_date,
        notes,
        invoice_ids,
        line_items
      } = input;

      // Get full UUIDs from the database
      const customerHexPrefix = extractUuid(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerUuid = customerResult.rows[0].id;
      let estimateUuid = null;

      if (estimate_id) {
        const estimateHexPrefix = extractUuid(estimate_id);
        const estimateResult = await query(
          `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${estimateHexPrefix}%`]
        );

        if (estimateResult.rows.length === 0) {
          throw new Error('Estimate not found');
        }

        estimateUuid = estimateResult.rows[0].id;
      }

      const result = await query(
        `INSERT INTO jobs (customer_id, estimate_id, title, description, address, city, state, zip, total_amount, payment_schedule, start_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
         RETURNING *`,
        [customerUuid, estimateUuid, title, description, address, city, state, zip, total_amount, payment_schedule || '50/40/10', start_date, notes]
      );

      const job = result.rows[0];

      // Invalidate cache after creating job
      invalidateCache([
        'job:all',
        `job:customer:${toGid('Customer', customerUuid)}`,
        'dashboard:analytics',
      ]);

      // Handle invoices: either link existing ones or auto-create new ones
      if (invoice_ids && invoice_ids.length > 0) {
        // Link existing invoices to the job
        for (const invoice_id of invoice_ids) {
          const invoiceHexPrefix = extractUuid(invoice_id);

          const updateResult = await query(
            `UPDATE invoices
             SET job_id = $1, updated_at = NOW()
             WHERE REPLACE(id::text, '-', '') LIKE $2
             RETURNING id`,
            [job.id, `${invoiceHexPrefix}%`]
          );

          if (updateResult.rows.length === 0) {
            throw new Error(`Invoice with id ${invoice_id} not found`);
          }
        }
      } else {
        // Auto-create invoices based on payment schedule
        const schedule = (payment_schedule || '50/40/10').split('/').map(p => parseInt(p));

        // Define stages and descriptions based on schedule length
        let stages, stageDescriptions;
        if (schedule.length === 1) {
          // 100% - due on completion
          stages = ['completion'];
          stageDescriptions = ['Payment due on completion'];
        } else if (schedule.length === 2) {
          // 50/50
          stages = ['start', 'completion'];
          stageDescriptions = [
            'Initial payment - Job start',
            'Final payment - Painting completion'
          ];
        } else {
          // 50/40/10 or custom
          stages = ['start', 'completion', 'touchup'];
          stageDescriptions = [
            'Initial payment - Job start',
            'Second payment - Painting completion',
            'Final payment - After touch-ups'
          ];
        }

        // Get next invoice number
        const lastInvoiceResult = await query(
          `SELECT invoice_number FROM invoices
           WHERE invoice_number ~ '^[0-9]+$'
           ORDER BY CAST(invoice_number AS INTEGER) DESC
           LIMIT 1`
        );
        let nextInvoiceNumber = 1;
        if (lastInvoiceResult.rows.length > 0 && lastInvoiceResult.rows[0].invoice_number) {
          nextInvoiceNumber = parseInt(lastInvoiceResult.rows[0].invoice_number) + 1;
        }

        for (let i = 0; i < schedule.length; i++) {
          const percentage = schedule[i];
          const amount = (total_amount * percentage / 100).toFixed(2);
          const invoiceNumber = (nextInvoiceNumber + i).toString();

          // Calculate proportional line items for this invoice
          let invoiceLineItems = [];
          if (line_items && line_items.length > 0) {
            invoiceLineItems = line_items.map(item => ({
              description: `${item.name} - ${percentage}% (${stages[i]})${item.description ? ` - ${item.description}` : ''}`,
              quantity: item.quantity,
              rate: (item.rate * percentage / 100).toFixed(2),
              amount: (item.amount * percentage / 100).toFixed(2)
            }));
          }

          // For 100% payment schedule, use title without payment info
          const invoiceTitle = schedule.length === 1
            ? title
            : `${title} - Payment ${i + 1} (${percentage}%)`;

          await query(
            `INSERT INTO invoices (customer_id, job_id, estimate_id, invoice_number, title, description, line_items, total, payment_stage, percentage, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unpaid')`,
            [
              customerUuid,
              job.id,
              estimateUuid,
              invoiceNumber,
              invoiceTitle,
              stageDescriptions[i] || `Payment ${i + 1}`,
              JSON.stringify(invoiceLineItems),
              amount,
              stages[i] || `payment_${i + 1}`,
              percentage
            ]
          );
        }
      }

      // Update job total_amount with sum of all invoice totals
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [job.id]
      );

      return toGidFormat(job, 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
    },

    updateJob: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // First get the existing job
      const existingJobResult = await query(
        `SELECT * FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (existingJobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const existingJob = existingJobResult.rows[0];

      // Build update object with existing values as defaults
      const updates = {
        customer_id: existingJob.customer_id,
        estimate_id: existingJob.estimate_id,
        title: input.title !== undefined ? input.title : existingJob.title,
        description: input.description !== undefined ? input.description : existingJob.description,
        address: input.address !== undefined ? input.address : existingJob.address,
        city: input.city !== undefined ? input.city : existingJob.city,
        state: input.state !== undefined ? input.state : existingJob.state,
        zip: input.zip !== undefined ? input.zip : existingJob.zip,
        total_amount: input.total_amount !== undefined ? input.total_amount : existingJob.total_amount,
        payment_schedule: input.payment_schedule !== undefined ? input.payment_schedule : existingJob.payment_schedule,
        status: input.status !== undefined ? input.status : existingJob.status,
        start_date: input.start_date !== undefined ? input.start_date : existingJob.start_date,
        completion_date: input.completion_date !== undefined ? input.completion_date : existingJob.completion_date,
        notes: input.notes !== undefined ? input.notes : existingJob.notes,
      };

      // Validate and convert customer_id if provided
      if (input.customer_id) {
        const customerHexPrefix = extractUuid(input.customer_id);
        const customerResult = await query(
          `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${customerHexPrefix}%`]
        );

        if (customerResult.rows.length === 0) {
          throw new Error('Customer not found');
        }

        updates.customer_id = customerResult.rows[0].id;
      }

      // Validate and convert estimate_id if provided
      if (input.estimate_id) {
        const estimateHexPrefix = extractUuid(input.estimate_id);
        const estimateResult = await query(
          `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${estimateHexPrefix}%`]
        );

        if (estimateResult.rows.length === 0) {
          throw new Error('Estimate not found');
        }

        updates.estimate_id = estimateResult.rows[0].id;
      }

      const result = await query(
        `UPDATE jobs
         SET customer_id = $1, estimate_id = $2, title = $3, description = $4,
             address = $5, city = $6, state = $7, zip = $8, total_amount = $9,
             payment_schedule = $10, status = $11, start_date = $12, completion_date = $13,
             notes = $14, updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $15
         RETURNING *`,
        [updates.customer_id, updates.estimate_id, updates.title, updates.description, updates.address, updates.city, updates.state, updates.zip, updates.total_amount, updates.payment_schedule, updates.status, updates.start_date, updates.completion_date, updates.notes, `${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Job not found');
      }

      const updatedJob = result.rows[0];

      // Invalidate cache after updating job
      const updatedJobGid = toGidFormat(updatedJob, 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
      invalidateCache([
        'job:all',
        `job:${updatedJobGid.id}`,
        `job:customer:${toGid('Customer', existingJob.customer_id)}`,
        ...(updates.customer_id !== existingJob.customer_id ? [`job:customer:${toGid('Customer', updates.customer_id)}`] : []),
        'dashboard:analytics',
      ]);

      return updatedJobGid;
    },

    deleteJob: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Get job before deleting for cache invalidation
      const jobResult = await query(
        `SELECT customer_id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const customerId = jobResult.rows[0].customer_id;

      const result = await query(
        `DELETE FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      // Invalidate cache after deleting job
      const deletedJobGid = toGid('Job', result.rows[0].id);
      invalidateCache([
        'job:all',
        `job:${deletedJobGid}`,
        `job:customer:${toGid('Customer', customerId)}`,
        'dashboard:analytics',
      ]);

      return true;
    },

    acceptEstimate: async (_, { id, payment_schedule }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Get the estimate
      const estimateResult = await query(
        `SELECT * FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (estimateResult.rows.length === 0) {
        throw new Error('Estimate not found');
      }

      const estimate = estimateResult.rows[0];

      // Create job from estimate data
      const jobResult = await query(
        `INSERT INTO jobs (customer_id, estimate_id, title, description, total_amount, payment_schedule, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [
          estimate.customer_id,
          estimate.id,
          estimate.title,
          estimate.description,
          estimate.total,
          payment_schedule
        ]
      );

      const job = jobResult.rows[0];

      // Update estimate status to accepted
      await query(
        `UPDATE estimates SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [estimate.id]
      );

      // Auto-create invoices based on payment schedule
      const schedule = payment_schedule.split('/').map(p => parseInt(p));

      // Define stages and descriptions based on schedule length
      let stages, stageDescriptions;
      if (schedule.length === 1) {
        // 100% - due on completion
        stages = ['completion'];
        stageDescriptions = ['Payment due on completion'];
      } else if (schedule.length === 2) {
        // 50/50
        stages = ['start', 'completion'];
        stageDescriptions = [
          'Initial payment - Job start',
          'Final payment - Painting completion'
        ];
      } else {
        // 50/40/10 or custom
        stages = ['start', 'completion', 'touchup'];
        stageDescriptions = [
          'Initial payment - Job start',
          'Second payment - Painting completion',
          'Final payment - After touch-ups'
        ];
      }

      // Get next invoice number
      const lastInvoiceResult = await query(
        `SELECT invoice_number FROM invoices
         WHERE invoice_number ~ '^[0-9]+$'
         ORDER BY CAST(invoice_number AS INTEGER) DESC
         LIMIT 1`
      );
      let nextInvoiceNumber = 1;
      if (lastInvoiceResult.rows.length > 0 && lastInvoiceResult.rows[0].invoice_number) {
        nextInvoiceNumber = parseInt(lastInvoiceResult.rows[0].invoice_number) + 1;
      }

      for (let i = 0; i < schedule.length; i++) {
        const percentage = schedule[i];
        const amount = (estimate.total * percentage / 100).toFixed(2);
        const invoiceNumber = (nextInvoiceNumber + i).toString();

        // For 100% payment schedule, use title without payment info
        const invoiceTitle = schedule.length === 1
          ? estimate.title
          : `${estimate.title} - Payment ${i + 1} (${percentage}%)`;

        await query(
          `INSERT INTO invoices (customer_id, job_id, estimate_id, invoice_number, title, description, line_items, subtotal, tax, total, payment_stage, percentage, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'unpaid')`,
          [
            estimate.customer_id,
            job.id,
            estimate.id,
            invoiceNumber,
            invoiceTitle,
            stageDescriptions[i] || `Payment ${i + 1}`,
            estimate.line_items,
            estimate.subtotal,
            estimate.tax,
            amount,
            stages[i] || `payment_${i + 1}`,
            percentage
          ]
        );
      }

      // Update job total_amount with sum of all invoice totals
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [job.id]
      );

      // Invalidate cache after accepting estimate and creating job
      invalidateCache([
        'job:all',
        `job:customer:${toGid('Customer', estimate.customer_id)}`,
        'invoice:all',
        'dashboard:analytics',
      ]);

      return toGidFormat(job, 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
    },

    linkInvoicesToJob: async (_, { job_id, invoice_ids }, { user }) => {
      requireAuth(user);
      const jobHexPrefix = extractUuid(job_id);

      // Verify job exists
      const jobResult = await query(
        `SELECT * FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${jobHexPrefix}%`]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];

      // Link each invoice to the job
      for (const invoice_id of invoice_ids) {
        const invoiceHexPrefix = extractUuid(invoice_id);

        const updateResult = await query(
          `UPDATE invoices
           SET job_id = $1, updated_at = NOW()
           WHERE REPLACE(id::text, '-', '') LIKE $2
           RETURNING id`,
          [job.id, `${invoiceHexPrefix}%`]
        );

        if (updateResult.rows.length === 0) {
          throw new Error(`Invoice with id ${invoice_id} not found`);
        }
      }

      // Update job total_amount with sum of all invoice totals
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [job.id]
      );

      // Fetch updated job with stats
      const updatedJobResult = await query(
        `SELECT j.*,
                (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
                (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
                (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
         FROM jobs j
         WHERE j.id = $1`,
        [job.id]
      );

      // Invalidate cache after linking invoices to job
      const updatedJobGid = toGidFormat(updatedJobResult.rows[0], 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
      invalidateCache([
        'job:all',
        `job:${updatedJobGid.id}`,
        `job:customer:${toGid('Customer', job.customer_id)}`,
        'invoice:all',
        ...invoice_ids.map(inv_id => `invoice:${inv_id}`),
        'dashboard:analytics',
      ]);

      return updatedJobGid;
    },
  },
};
