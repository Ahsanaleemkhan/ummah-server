const express = require('express');
const router = express.Router();
const { readResource } = require('../utils/dataStore');

// GET /api/tours - List all tours with optional filtering
router.get('/', async (req, res, next) => {
    try {
        let results = [...(await readResource('tours'))];
        const { destination, type, duration, trending, minPrice, maxPrice } = req.query;

        if (destination) {
            results = results.filter((t) => t.destination.toLowerCase().includes(destination.toLowerCase()));
        }
        if (type) {
            results = results.filter((t) => t.type.toLowerCase() === type.toLowerCase());
        }
        if (duration) {
            results = results.filter((t) => t.duration.toLowerCase().includes(duration.toLowerCase()));
        }
        if (trending === 'true') {
            results = results.filter((t) => t.trending === true);
        }
        if (minPrice) {
            results = results.filter((t) => t.price >= Number(minPrice));
        }
        if (maxPrice) {
            results = results.filter((t) => t.price <= Number(maxPrice));
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

// GET /api/tours/:id - Get single tour
router.get('/:id', async (req, res, next) => {
    try {
        const tours = await readResource('tours');
        const tour = tours.find((t) => t.id === req.params.id);
        if (!tour) {
            return res.status(404).json({ success: false, message: 'Tour not found' });
        }
        res.json({ success: true, data: tour });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
