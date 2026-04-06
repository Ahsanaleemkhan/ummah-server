const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
    RESOURCE_FILE_MAP,
    createResourceId,
    readDataFile,
    readResource,
    writeDataFile,
    writeResource,
} = require('../utils/dataStore');
const {
    getPageCatalog,
    getPageContent,
    getPageSectionContent,
    resetPageSectionContent,
    upsertPageSectionContent,
} = require('../utils/pageContentStore');
const {
    UPLOADS_DIR,
    ensureUploadsDir,
    registerMediaAsset,
    listMediaAssets,
    deleteMediaAsset,
} = require('../utils/mediaStore');

const MANAGEABLE_RESOURCES = Object.keys(RESOURCE_FILE_MAP);
const INTEGRATIONS_FILE = 'admin-integrations.json';
const SITE_SETTINGS_FILE = 'site-settings.json';
const ACTIVITY_FILE = 'admin-activity.json';
const MAX_MEDIA_UPLOAD_BYTES = 8 * 1024 * 1024;

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const buildPublicBaseUrl = (req) => {
    const configured = String(process.env.PUBLIC_API_BASE_URL || '').trim();
    if (configured) {
        return configured.replace(/\/$/, '');
    }

    return `${req.protocol}://${req.get('host')}`;
};

const sanitizeExtension = (originalName, mimeType) => {
    const extension = path.extname(String(originalName || '')).toLowerCase();

    const safeByMime = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/avif': '.avif',
        'image/svg+xml': '.svg',
    };

    if (safeByMime[mimeType]) {
        return safeByMime[mimeType];
    }

    return extension || '.bin';
};

const mediaUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            ensureUploadsDir()
                .then(() => cb(null, UPLOADS_DIR))
                .catch((error) => cb(error));
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).slice(2, 10);
            const extension = sanitizeExtension(file.originalname, file.mimetype);
            cb(null, `${timestamp}-${random}${extension}`);
        },
    }),
    limits: {
        fileSize: MAX_MEDIA_UPLOAD_BYTES,
    },
    fileFilter: (req, file, cb) => {
        if (String(file.mimetype || '').startsWith('image/')) {
            cb(null, true);
            return;
        }

        cb(new Error('Only image files are allowed.'));
    },
});

const mediaUploadSingle = (req, res, next) => {
    mediaUpload.single('file')(req, res, (error) => {
        if (!error) {
            next();
            return;
        }

        error.statusCode = 400;
        next(error);
    });
};

const normalizeResource = (resource) => {
    const normalized = String(resource || '').toLowerCase().trim();

    if (!MANAGEABLE_RESOURCES.includes(normalized)) {
        const error = new Error(`Unsupported resource: ${resource}`);
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

const getAdminActor = (req) => ({
    id: req.user?.id || 'unknown',
    name: req.user?.name || req.user?.email || 'Admin User',
    email: req.user?.email || '',
});

const appendActivity = async ({ actor, action, resource, details }) => {
    const existing = await readDataFile(ACTIVITY_FILE, []);
    const activityList = Array.isArray(existing) ? existing : [];

    activityList.unshift({
        id: `ACT${Date.now()}`,
        createdAt: new Date().toISOString(),
        actor,
        action,
        resource,
        details,
    });

    const trimmed = activityList.slice(0, 250);
    await writeDataFile(ACTIVITY_FILE, trimmed);
};

router.use(authMiddleware, requireRole('admin'));

router.get('/resources', (req, res) => {
    res.json({
        success: true,
        data: MANAGEABLE_RESOURCES,
    });
});

router.get('/overview', asyncHandler(async (req, res) => {
    const datasets = await Promise.all(MANAGEABLE_RESOURCES.map((resource) => readResource(resource)));

    const totals = MANAGEABLE_RESOURCES.reduce((acc, resource, index) => {
        acc[resource] = datasets[index].length;
        return acc;
    }, {});

    const integrations = await readDataFile(INTEGRATIONS_FILE, []);
    const integrationList = Array.isArray(integrations) ? integrations : [];
    const purchasedCount = integrationList.filter((item) => item.purchased === true).length;

    res.json({
        success: true,
        data: {
            generatedAt: new Date().toISOString(),
            resources: totals,
            integrations: {
                total: integrationList.length,
                purchased: purchasedCount,
                pending: Math.max(integrationList.length - purchasedCount, 0),
            },
        },
    });
}));

router.get('/resources/:resource', asyncHandler(async (req, res) => {
    const resource = normalizeResource(req.params.resource);
    const query = String(req.query.q || '').trim().toLowerCase();
    const records = await readResource(resource);

    const filtered = query
        ? records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
        : records;

    res.json({
        success: true,
        count: filtered.length,
        data: filtered,
    });
}));

router.post('/resources/:resource', asyncHandler(async (req, res) => {
    const resource = normalizeResource(req.params.resource);
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, message: 'Payload must be a JSON object.' });
    }

    const records = await readResource(resource);
    const nextRecord = { ...payload };

    if (!nextRecord.id) {
        nextRecord.id = createResourceId(resource, records);
    }

    const duplicate = records.some((record) => String(record.id) === String(nextRecord.id));
    if (duplicate) {
        return res.status(409).json({ success: false, message: `Record ID ${nextRecord.id} already exists.` });
    }

    records.unshift(nextRecord);
    await writeResource(resource, records);

    await appendActivity({
        actor: getAdminActor(req),
        action: 'create',
        resource,
        details: `Created ${resource} record ${nextRecord.id}`,
    });

    res.status(201).json({
        success: true,
        message: `${resource} record created successfully`,
        data: nextRecord,
    });
}));

router.put('/resources/:resource/:id', asyncHandler(async (req, res) => {
    const resource = normalizeResource(req.params.resource);
    const recordId = String(req.params.id);
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, message: 'Payload must be a JSON object.' });
    }

    const records = await readResource(resource);
    const recordIndex = records.findIndex((record) => String(record.id) === recordId);

    if (recordIndex === -1) {
        return res.status(404).json({ success: false, message: `${resource} record not found` });
    }

    const existing = records[recordIndex];
    const updated = {
        ...existing,
        ...payload,
        id: existing.id,
    };

    records[recordIndex] = updated;
    await writeResource(resource, records);

    await appendActivity({
        actor: getAdminActor(req),
        action: 'update',
        resource,
        details: `Updated ${resource} record ${recordId}`,
    });

    res.json({
        success: true,
        message: `${resource} record updated successfully`,
        data: updated,
    });
}));

router.delete('/resources/:resource/:id', asyncHandler(async (req, res) => {
    const resource = normalizeResource(req.params.resource);
    const recordId = String(req.params.id);
    const records = await readResource(resource);
    const recordIndex = records.findIndex((record) => String(record.id) === recordId);

    if (recordIndex === -1) {
        return res.status(404).json({ success: false, message: `${resource} record not found` });
    }

    const [deleted] = records.splice(recordIndex, 1);
    await writeResource(resource, records);

    await appendActivity({
        actor: getAdminActor(req),
        action: 'delete',
        resource,
        details: `Deleted ${resource} record ${recordId}`,
    });

    res.json({
        success: true,
        message: `${resource} record deleted successfully`,
        data: deleted,
    });
}));

router.get('/integrations', asyncHandler(async (req, res) => {
    const integrations = await readDataFile(INTEGRATIONS_FILE, []);

    res.json({
        success: true,
        count: Array.isArray(integrations) ? integrations.length : 0,
        data: Array.isArray(integrations) ? integrations : [],
    });
}));

router.put('/integrations/:id', asyncHandler(async (req, res) => {
    const integrationId = String(req.params.id);
    const integrations = await readDataFile(INTEGRATIONS_FILE, []);

    if (!Array.isArray(integrations)) {
        return res.status(500).json({ success: false, message: 'Integration data is invalid.' });
    }

    const index = integrations.findIndex((item) => String(item.id) === integrationId);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    const allowedFields = [
        'name',
        'provider',
        'category',
        'purpose',
        'priority',
        'monthlyCost',
        'environmentVar',
        'status',
        'purchased',
        'apiKey',
        'notes',
        'documentationUrl',
    ];

    const payload = req.body || {};
    const current = integrations[index];
    const updated = { ...current };

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            updated[field] = payload[field];
        }
    }

    integrations[index] = updated;
    await writeDataFile(INTEGRATIONS_FILE, integrations);

    await appendActivity({
        actor: getAdminActor(req),
        action: 'update',
        resource: 'integrations',
        details: `Updated integration ${integrationId}`,
    });

    res.json({
        success: true,
        message: 'Integration updated successfully',
        data: updated,
    });
}));

router.get('/site-settings', asyncHandler(async (req, res) => {
    const settings = await readDataFile(SITE_SETTINGS_FILE, {});

    res.json({
        success: true,
        data: settings || {},
    });
}));

router.put('/site-settings', asyncHandler(async (req, res) => {
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, message: 'Site settings must be a JSON object.' });
    }

    const nextSettings = {
        ...payload,
        updatedAt: new Date().toISOString(),
    };

    await writeDataFile(SITE_SETTINGS_FILE, nextSettings);

    await appendActivity({
        actor: getAdminActor(req),
        action: 'update',
        resource: 'site-settings',
        details: 'Updated site settings',
    });

    res.json({
        success: true,
        message: 'Site settings updated successfully',
        data: nextSettings,
    });
}));

router.get('/activity', asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const activity = await readDataFile(ACTIVITY_FILE, []);
    const records = Array.isArray(activity) ? activity.slice(0, limit) : [];

    res.json({
        success: true,
        count: records.length,
        data: records,
    });
}));

router.get('/media', asyncHandler(async (req, res) => {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 2000);
    const records = await listMediaAssets({ query, limit });

    res.json({
        success: true,
        count: records.length,
        data: records,
    });
}));

router.post('/media/upload', mediaUploadSingle, asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image file is required.' });
    }

    const actor = getAdminActor(req);

    const media = await registerMediaAsset({
        file: req.file,
        publicBaseUrl: buildPublicBaseUrl(req),
        actor,
        pageKey: req.body.pageKey,
        sectionKey: req.body.sectionKey,
        fieldPath: req.body.fieldPath,
    });

    await appendActivity({
        actor,
        action: 'upload',
        resource: 'media',
        details: `Uploaded media ${media.id}${media.pageKey ? ` for ${media.pageKey}.${media.sectionKey}` : ''}`,
    });

    res.status(201).json({
        success: true,
        message: 'Media uploaded successfully',
        data: media,
    });
}));

router.delete('/media/:mediaId', asyncHandler(async (req, res) => {
    const actor = getAdminActor(req);
    const mediaId = String(req.params.mediaId || '').trim();
    const deleted = await deleteMediaAsset(mediaId);

    await appendActivity({
        actor,
        action: 'delete',
        resource: 'media',
        details: `Deleted media ${mediaId}`,
    });

    res.json({
        success: true,
        message: 'Media deleted successfully',
        data: deleted,
    });
}));

router.get('/page-content/pages', asyncHandler(async (req, res) => {
    const pages = await getPageCatalog();

    res.json({
        success: true,
        count: pages.length,
        data: pages,
    });
}));

router.get('/page-content/:pageKey', asyncHandler(async (req, res) => {
    const payload = await getPageContent(req.params.pageKey);

    res.json({
        success: true,
        data: payload,
    });
}));

router.get('/page-content/:pageKey/:sectionKey', asyncHandler(async (req, res) => {
    const payload = await getPageSectionContent(req.params.pageKey, req.params.sectionKey);

    res.json({
        success: true,
        data: payload,
    });
}));

router.put('/page-content/:pageKey/:sectionKey', asyncHandler(async (req, res) => {
    const actor = getAdminActor(req);

    const payload = await upsertPageSectionContent({
        pageKey: req.params.pageKey,
        sectionKey: req.params.sectionKey,
        content: req.body,
        actor,
    });

    await appendActivity({
        actor,
        action: 'update',
        resource: 'page-content',
        details: `Updated ${req.params.pageKey}.${req.params.sectionKey}`,
    });

    res.json({
        success: true,
        message: 'Page section content updated successfully',
        data: payload,
    });
}));

router.delete('/page-content/:pageKey/:sectionKey', asyncHandler(async (req, res) => {
    const actor = getAdminActor(req);

    const payload = await resetPageSectionContent({
        pageKey: req.params.pageKey,
        sectionKey: req.params.sectionKey,
    });

    await appendActivity({
        actor,
        action: 'reset',
        resource: 'page-content',
        details: `Reset ${req.params.pageKey}.${req.params.sectionKey} to defaults`,
    });

    res.json({
        success: true,
        message: 'Page section content reset to defaults',
        data: payload,
    });
}));

module.exports = router;
