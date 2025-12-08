import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { toGidFormat, extractUuidForQuery } from '../utils/resolverHelpers.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    );
    const customers = result.rows.map(row => toGidFormat(row, 'Customer'));
    res.json({ customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = toGidFormat(result.rows[0], 'Customer');
    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO customers (name, email, phone, address, city, state, zip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, email, phone, address, city, state, zip]
    );

    const customer = toGidFormat(result.rows[0], 'Customer');
    res.status(201).json({ customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, state, zip } = req.body;
    const hexPrefix = extractUuidForQuery(id);

    const result = await query(
      `UPDATE customers
       SET name = $1, email = $2, phone = $3, address = $4,
           city = $5, state = $6, zip = $7, updated_at = NOW()
       WHERE REPLACE(id::text, '-', '') LIKE $8
       RETURNING *`,
      [name, email, phone, address, city, state, zip, `${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = toGidFormat(result.rows[0], 'Customer');
    res.json({ customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `DELETE FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
