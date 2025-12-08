import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { toGidFormat, extractUuidForQuery, toGidFormatArray } from '../utils/resolverHelpers.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT j.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone,
              (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
              (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
              (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
       FROM jobs j
       LEFT JOIN customers c ON j.customer_id = c.id
       ORDER BY j.created_at DESC`
    );
    const jobs = toGidFormatArray(result.rows, 'Job', {
      customer_id: 'Customer',
      estimate_id: 'Estimate'
    });
    res.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);

    const jobResult = await query(
      `SELECT j.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address,
              c.city as customer_city, c.state as customer_state, c.zip as customer_zip,
              e.title as estimate_title
       FROM jobs j
       LEFT JOIN customers c ON j.customer_id = c.id
       LEFT JOIN estimates e ON j.estimate_id = e.id
       WHERE REPLACE(j.id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobUuid = jobResult.rows[0].id;
    const invoicesResult = await query(
      `SELECT * FROM invoices WHERE job_id = $1 ORDER BY payment_stage`,
      [jobUuid]
    );

    const job = toGidFormat(jobResult.rows[0], 'Job', {
      customer_id: 'Customer',
      estimate_id: 'Estimate'
    });

    const invoices = toGidFormatArray(invoicesResult.rows, 'Invoice', {
      customer_id: 'Customer',
      job_id: 'Job',
      estimate_id: 'Estimate'
    });

    res.json({ job, invoices });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/', async (req, res) => {
  try {
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
      notes
    } = req.body;

    if (!customer_id || !title || !total_amount) {
      return res.status(400).json({ error: 'Customer, title, and total amount are required' });
    }

    // Convert customer GID to UUID
    const customerHexPrefix = extractUuidForQuery(customer_id);
    const customerResult = await query(
      `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${customerHexPrefix}%`]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerUuid = customerResult.rows[0].id;

    // Convert estimate GID to UUID if provided
    let estimateUuid = null;
    if (estimate_id) {
      const estimateHexPrefix = extractUuidForQuery(estimate_id);
      const estimateResult = await query(
        `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${estimateHexPrefix}%`]
      );

      if (estimateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Estimate not found' });
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

    // Auto-create invoices based on payment schedule
    const schedule = (payment_schedule || '50/40/10').split('/').map(p => parseInt(p));
    const stages = ['start', 'completion', 'touchup'];
    const stageDescriptions = [
      'Initial payment - Job start',
      'Second payment - Painting completion',
      'Final payment - After touch-ups'
    ];

    for (let i = 0; i < schedule.length; i++) {
      const percentage = schedule[i];
      const amount = (total_amount * percentage / 100).toFixed(2);

      await query(
        `INSERT INTO invoices (customer_id, job_id, estimate_id, title, description, total, payment_stage, percentage, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid')`,
        [
          customerUuid,
          job.id,
          estimateUuid,
          `${title} - Payment ${i + 1} (${percentage}%)`,
          stageDescriptions[i],
          amount,
          stages[i],
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

    const jobGid = toGidFormat(job, 'Job', {
      customer_id: 'Customer',
      estimate_id: 'Estimate'
    });
    res.status(201).json({ job: jobGid });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      status,
      start_date,
      completion_date,
      notes
    } = req.body;

    const hexPrefix = extractUuidForQuery(id);

    // Convert customer GID to UUID if provided
    let customerUuid = customer_id;
    if (customer_id) {
      const customerHexPrefix = extractUuidForQuery(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      customerUuid = customerResult.rows[0].id;
    }

    // Convert estimate GID to UUID if provided
    let estimateUuid = estimate_id;
    if (estimate_id) {
      const estimateHexPrefix = extractUuidForQuery(estimate_id);
      const estimateResult = await query(
        `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${estimateHexPrefix}%`]
      );

      if (estimateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      estimateUuid = estimateResult.rows[0].id;
    }

    const result = await query(
      `UPDATE jobs
       SET customer_id = $1, estimate_id = $2, title = $3, description = $4,
           address = $5, city = $6, state = $7, zip = $8, total_amount = $9,
           payment_schedule = $10, status = $11, start_date = $12, completion_date = $13,
           notes = $14, updated_at = NOW()
       WHERE REPLACE(id::text, '-', '') LIKE $15
       RETURNING *`,
      [customerUuid, estimateUuid, title, description, address, city, state, zip, total_amount, payment_schedule, status, start_date, completion_date, notes, `${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = toGidFormat(result.rows[0], 'Job', {
      customer_id: 'Customer',
      estimate_id: 'Estimate'
    });
    res.json({ job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `DELETE FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
