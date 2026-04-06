const express = require('express');
const router = express.Router();
const { readResource } = require('../utils/dataStore');

// GET /api/flights - List all flights with optional filtering
router.get('/', async (req, res, next) => {
    try {
        let results = [...(await readResource('flights'))];
        const { origin, destination, date, class: flightClass, minPrice, maxPrice } = req.query;

        if (origin) {
            results = results.filter((f) => f.origin.toLowerCase().includes(origin.toLowerCase()));
        }
        if (destination) {
            results = results.filter((f) => f.destination.toLowerCase().includes(destination.toLowerCase()));
        }
        if (date) {
            results = results.filter((f) => f.departDate === date);
        }
        if (flightClass) {
            results = results.filter((f) => f.class.toLowerCase() === flightClass.toLowerCase());
        }
        if (minPrice) {
            results = results.filter((f) => f.price >= Number(minPrice));
        }
        if (maxPrice) {
            results = results.filter((f) => f.price <= Number(maxPrice));
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

// GET /api/flights/:id - Get single flight
router.get('/:id', async (req, res, next) => {
    try {
        const flights = await readResource('flights');
        const flight = flights.find((f) => f.id === req.params.id);
        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }
        res.json({ success: true, data: flight });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
