const express = require('express');
const router = express.Router();
const { readResource } = require('../utils/dataStore');

// GET /api/hotels - List all hotels with optional filtering
router.get('/', async (req, res, next) => {
    try {
        let results = [...(await readResource('hotels'))];
        const { city, country, minRating, minPrice, maxPrice } = req.query;

        if (city) {
            results = results.filter((h) => h.city.toLowerCase().includes(city.toLowerCase()));
        }
        if (country) {
            results = results.filter((h) => h.country.toLowerCase().includes(country.toLowerCase()));
        }
        if (minRating) {
            results = results.filter((h) => h.rating >= Number(minRating));
        }
        if (minPrice) {
            results = results.filter((h) => h.pricePerNight >= Number(minPrice));
        }
        if (maxPrice) {
            results = results.filter((h) => h.pricePerNight <= Number(maxPrice));
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

// GET /api/hotels/:id - Get single hotel
router.get('/:id', async (req, res, next) => {
    try {
        const hotels = await readResource('hotels');
        const hotel = hotels.find((h) => h.id === req.params.id);
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hotel not found' });
        }
        res.json({ success: true, data: hotel });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
