import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { toGidFormat, extractUuidForQuery, toGidFormatArray } from '../utils/resolverHelpers.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, c.name as customer_name, c.email as customer_email
       FROM estimates e
       LEFT JOIN customers c ON e.customer_id = c.id
       ORDER BY e.created_at DESC`
    );
    const estimates = toGidFormatArray(result.rows, 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimates });
  } catch (error) {
    console.error('Get estimates error:', error);
    res.status(500).json({ error: 'Failed to fetch estimates' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `SELECT e.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address
       FROM estimates e
       LEFT JOIN customers c ON e.customer_id = c.id
       WHERE REPLACE(e.id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimate });
  } catch (error) {
    console.error('Get estimate error:', error);
    res.status(500).json({ error: 'Failed to fetch estimate' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, title, description, line_items, subtotal, tax, total, notes } = req.body;

    if (!customer_id || !title || !total) {
      return res.status(400).json({ error: 'Customer, title, and total are required' });
    }

    // Convert customer GID to UUID for database insert
    const customerHexPrefix = extractUuidForQuery(customer_id);
    const customerResult = await query(
      `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${customerHexPrefix}%`]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerUuid = customerResult.rows[0].id;

    const result = await query(
      `INSERT INTO estimates (customer_id, title, description, line_items, subtotal, tax, total, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes]
    );

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.status(201).json({ estimate });
  } catch (error) {
    console.error('Create estimate error:', error);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, title, description, line_items, subtotal, tax, total, notes, status } = req.body;

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

    const result = await query(
      `UPDATE estimates
       SET customer_id = $1, title = $2, description = $3, line_items = $4,
           subtotal = $5, tax = $6, total = $7, notes = $8, status = $9, updated_at = NOW()
       WHERE REPLACE(id::text, '-', '') LIKE $10
       RETURNING *`,
      [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes, status, `${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimate });
  } catch (error) {
    console.error('Update estimate error:', error);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `DELETE FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Delete estimate error:', error);
    res.status(500).json({ error: 'Failed to delete estimate' });
  }
});

export default router;
