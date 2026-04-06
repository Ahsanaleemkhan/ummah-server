const express = require('express');
const router = express.Router();
const { readResource } = require('../utils/dataStore');

// GET /api/umrah - List all Umrah packages with optional filtering
router.get('/', async (req, res, next) => {
    try {
        let results = [...(await readResource('umrah'))];
        const { city, country, type, duration, minPrice, maxPrice } = req.query;

        if (city) {
            results = results.filter((u) => u.city.toLowerCase().includes(city.toLowerCase()));
        }
        if (country) {
            results = results.filter((u) => u.country.toLowerCase().includes(country.toLowerCase()));
        }
        if (type) {
            results = results.filter((u) => u.type.toLowerCase() === type.toLowerCase());
        }
        if (duration) {
            results = results.filter((u) => u.duration.toLowerCase().includes(duration.toLowerCase()));
        }
        if (minPrice) {
            results = results.filter((u) => u.price >= Number(minPrice));
        }
        if (maxPrice) {
            results = results.filter((u) => u.price <= Number(maxPrice));
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

// GET /api/umrah/:id - Get single Umrah package
router.get('/:id', async (req, res, next) => {
    try {
        const umrahPackages = await readResource('umrah');
        const pkg = umrahPackages.find((u) => u.id === req.params.id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Umrah package not found' });
        }
        res.json({ success: true, data: pkg });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
