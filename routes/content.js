const express = require('express');

const router = express.Router();

const {
  getPageCatalog,
  getPageContent,
  getPageSectionContent,
} = require('../utils/pageContentStore');
const { readDataFile } = require('../utils/dataStore');

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/pages', asyncHandler(async (req, res) => {
  const pages = await getPageCatalog();

  res.json({
    success: true,
    count: pages.length,
    data: pages,
  });
}));

router.get('/pages/:pageKey', asyncHandler(async (req, res) => {
  const pagePayload = await getPageContent(req.params.pageKey);

  let sharedSections = {};
  if (String(req.params.pageKey || '').toLowerCase() !== 'shared') {
    const sharedPayload = await getPageContent('shared');
    sharedSections = sharedPayload.sections;
  }

  res.json({
    success: true,
    data: {
      ...pagePayload,
      sharedSections,
    },
  });
}));

router.get('/pages/:pageKey/:sectionKey', asyncHandler(async (req, res) => {
  const sectionPayload = await getPageSectionContent(req.params.pageKey, req.params.sectionKey);

  res.json({
    success: true,
    data: sectionPayload,
  });
}));

router.get('/site-settings', asyncHandler(async (req, res) => {
  const settings = await readDataFile('site-settings.json', {});

  res.json({
    success: true,
    data: {
      brandName: settings?.brandName || 'Ummah Travel',
      supportEmail: settings?.supportEmail || '',
      supportPhone: settings?.supportPhone || '',
      whatsapp: settings?.whatsapp || '',
      defaultCurrency: settings?.defaultCurrency || 'USD',
      defaultLocale: settings?.defaultLocale || 'en-PK',
      seo: settings?.seo || {},
      designTokens: settings?.designTokens || {},
      typography: settings?.typography || {},
      customCss: settings?.customCss || '',
      updatedAt: settings?.updatedAt || null,
    },
  });
}));

module.exports = router;
