const express = require('express');
const router = express.Router();
const { readResource } = require('../utils/dataStore');

// GET /api/visas - List all visa info with optional filtering
router.get('/', async (req, res, next) => {
    try {
        let results = [...(await readResource('visas'))];
        const { country, type } = req.query;

        if (country) {
            results = results.filter((v) => v.country.toLowerCase().includes(country.toLowerCase()));
        }
        if (type) {
            results = results.filter((v) => v.type.toLowerCase().includes(type.toLowerCase()));
        }

        res.json({
            success: true,
            count: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/visas/:id - Get single visa info
router.get('/:id', async (req, res, next) => {
    try {
        const visas = await readResource('visas');
        const visa = visas.find((v) => v.id === req.params.id);
        if (!visa) {
            return res.status(404).json({ success: false, message: 'Visa info not found' });
        }
        res.json({ success: true, data: visa });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
