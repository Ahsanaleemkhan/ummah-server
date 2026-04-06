const fs = require('fs/promises');
const path = require('path');
const { getDbOrNull } = require('../config/database');
const { deleteMediaAsset } = require('./mediaStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PAGE_CONTENT_FILE = path.join(DATA_DIR, 'page-content.json');
const PAGE_CONTENT_COLLECTION = 'page_content_sections';

const PAGE_CONTENT_BLUEPRINT = Object.freeze({
  shared: {
    label: 'Shared',
    route: '*',
    sections: {
      theme: {
        label: 'Theme Tokens',
        description: 'Global color and typography tokens applied across the site.',
        defaultContent: {
          bodyFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          headingFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          bodyFontSize: '16px',
          headingScale: '1',
          lineHeight: '1.5',
          primaryColor: '#1B6B3A',
          secondaryColor: '#0d4a24',
          textColor: '#222222',
          headingColor: '#1a1a1a',
          backgroundColor: '#ffffff',
          surfaceColor: '#f7f8f5',
          borderRadius: '12px',
          customCss: '',
        },
      },
      footer: {
        label: 'Footer',
        description: 'Global footer links and brand copy across pages.',
        defaultContent: {
          brandMain: 'ummah',
          brandSub: 'travel',
          brandDesc: 'Trusted travel partner for flights, hotels, tours, Umrah, and Hajj with transparent pricing and dedicated support.',
          quickLinksTitle: 'Quick links',
          quickLinks: [
            { label: 'Tour Packages', href: '/tours' },
            { label: 'Hotels', href: '/hotels' },
            { label: 'Flights', href: '/flights' },
            { label: 'Who We Are', href: '/about' },
          ],
          packagesTitle: 'Packages',
          packagesLinks: [
            { label: 'Umrah Packages 2026', href: '/umrah-packages' },
            { label: 'Hajj Packages 2026', href: '/hajj-packages' },
            { label: 'International Tours', href: '/tours' },
            { label: 'Custom Packages', href: '/contact' },
            { label: 'Visa Assistance', href: '/contact' },
          ],
          supportTitle: 'Support',
          supportLinks: [
            { label: 'Contact', href: '/contact' },
            { label: 'FAQs', href: '/contact' },
            { label: 'Travel Blog', href: '/blog' },
            { label: 'Partner With Us', href: '/contact' },
          ],
        },
      },
    },
  },
  home: {
    label: 'Home',
    route: '/',
    sections: {
      hero: {
        label: 'Hero Section',
        description: 'Top navigation, service tabs, search placeholders, and hero image.',
        defaultContent: {
          loginButtonText: 'LOGIN / REGISTER',
          navItems: [
            { label: 'Flights', href: '/flights' },
            { label: 'Hotels', href: '/hotels' },
            { label: 'Tour Packages', href: '/tours' },
            { label: 'Destinations', href: '/tours' },
            { label: 'About Us', href: '/about' },
            { label: 'Blog / Travel Tips', href: '/blog' },
            { label: 'Contact', href: '/contact' },
          ],
          tabs: [
            { id: 'flight', label: 'Flight' },
            { id: 'hotels', label: 'Hotels' },
            { id: 'umrah', label: 'Umrah' },
            { id: 'tour', label: 'Tour' },
          ],
          fieldConfigs: {
            flight: { from: 'From', to: 'To', date: 'Sat, 26 Dec 2026', traveller: 'Return' },
            hotels: { from: 'City', to: 'Hotel', date: 'Check-in', traveller: 'Guests' },
            umrah: { from: 'Departure', to: 'Arrival', date: 'Sat, 26 Dec 2026', traveller: 'Package' },
            tour: { from: 'Country', to: 'City', date: 'Start Date', traveller: 'Travelers' },
          },
          planeImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80',
        },
      },
      popularAirlines: {
        label: 'Popular Airlines',
        description: 'Home section title above airlines logos.',
        defaultContent: {
          title: 'Popular Airlines',
        },
      },
      trendingVisas: {
        label: 'Trending Visas',
        description: 'Visa section title and both column lists.',
        defaultContent: {
          title: 'Trending Visas',
          leftVisas: [
            { code: 'au', name: 'Australia', price: 'PKR 95,000' },
            { code: 'ca', name: 'Canada', price: 'PKR 95,000' },
            { code: 'gr', name: 'Greece', price: 'PKR 75,000' },
            { code: 'my', name: 'Malaysia', price: 'PKR 16,000' },
            { code: 'th', name: 'Thailand', price: 'PKR 19,900' },
            { code: 'gb', name: 'United Kingdom', price: 'PKR 95,000' },
          ],
          rightVisas: [
            { code: 'az', name: 'Azerbaijan', price: 'PKR 13,000' },
            { code: 'eg', name: 'Egypt', price: 'PKR 75,000' },
            { code: 'hk', name: 'Hong Kong', price: 'PKR 49,000' },
            { code: 'sg', name: 'Singapore', price: 'PKR 25,000' },
            { code: 'ae', name: 'UAE 30 Days (Dubai ID)', price: 'PKR 32,000' },
            { code: 'us', name: 'USA', price: 'PKR 95,000' },
          ],
        },
      },
      mostPopularTours: {
        label: 'Most Popular Tours',
        description: 'Tours title, subtitle, cards, and button labels.',
        defaultContent: {
          title: 'Most Popular Tours',
          subtitle: 'Discover top flight deals for elite travel experiences at unprecedented prices',
          learnMoreLabel: 'Learn More',
          learnMoreHref: '#tours',
          tours: [
            {
              id: 'TOUR1',
              img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1000&q=80',
              title: 'Baku City Explorer',
              subtitle: 'Azerbaijan',
              desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. Risus commodo viverra maecenas accumsan lacus vel facilisis.',
            },
            {
              id: 'TOUR2',
              img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1000&q=80',
              title: 'Maldives Retreat',
              subtitle: 'Maldives',
              desc: 'Escape to paradise with overwater bungalows, pristine beaches, and crystal-clear lagoons. An unforgettable halal-friendly getaway for couples and families.',
            },
            {
              id: 'TOUR3',
              img: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1000&q=80',
              title: 'Vietnam Discovery',
              subtitle: 'Vietnam',
              desc: 'Journey through ancient temples, lush valleys and iconic floating villages. A cultural adventure blending history, nature and authentic local cuisine.',
            },
          ],
        },
      },
      umrahPackages: {
        label: 'Home Umrah Packages',
        description: 'Home package cards, labels, and detail button.',
        defaultContent: {
          title: 'Umrah Packages 2026',
          subtitle: 'Discover top flight deals for elite travel experiences at unprecedented prices',
          detailsLabel: 'Details',
          detailsHref: '/umrah-packages',
          packages: [
            {
              id: 'UMH001',
              img: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80',
              nights: '14 Nights',
              title: 'Lorem Ipsum',
              desc: 'Lorem ipsum',
              hotel: 'Lorem ipsum',
              meals: 'Rs. 500/-',
              price: 'Rs. 500/-',
            },
            {
              id: 'UMH002',
              img: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80',
              nights: '21 Nights',
              title: 'Lorem Ipsum',
              desc: 'Lorem ipsum',
              hotel: 'Lorem ipsum',
              meals: 'Rs. 500/-',
              price: 'Rs. 500/-',
            },
            {
              id: 'UMH003',
              img: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=600&q=80',
              nights: '10 Nights',
              title: 'Lorem Ipsum',
              desc: 'Lorem ipsum',
              hotel: 'Lorem ipsum',
              meals: 'Rs. 500/-',
              price: 'Rs. 500/-',
            },
          ],
        },
      },
      journeyCta: {
        label: 'Journey CTA',
        description: 'Home CTA text block before reviews/footer.',
        defaultContent: {
          headingNormal: 'Your Umrah Journey',
          headingBold: 'Begins Here',
        },
      },
    },
  },
  tours: {
    label: 'Tours',
    route: '/tours',
    sections: {
      hero: {
        label: 'Tours Hero',
        description: 'Hero title image and side statistics.',
        defaultContent: {
          showcaseTitle: 'Tour Packages',
          showcaseImage: 'https://cdn.pixabay.com/photo/2013/07/12/18/39/travel-153787_1280.png',
          leftStats: [
            { title: 'Unbeatable prices', text: 'Guaranteed value tours' },
            { title: '300,000+ Activities', text: 'Experiences across top cities' },
          ],
          rightStats: [
            { title: '200,000+ Hotels', text: 'Curated stays worldwide' },
            { title: 'Service assurance', text: 'Reliable support throughout' },
          ],
        },
      },
      packages: {
        label: 'Tours Offers',
        description: 'Tabs, package offers, and custom package callout.',
        defaultContent: {
          heading: 'PACKAGE OFFERS',
          tabs: [
            { key: 'all', label: 'All Packages' },
            { key: 'history', label: 'Travel History Packages' },
            { key: 'adventure', label: 'Adventure Packages' },
            { key: 'group', label: 'Group Packages' },
          ],
          offers: [
            {
              id: 1,
              category: 'history',
              typeLabel: 'Travel History',
              title: 'Explore Europe (9 Days)',
              price: 'PKR 680,000',
              note: 'Guided landmarks itinerary',
              image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80',
            },
            {
              id: 2,
              category: 'group',
              typeLabel: 'Group Package',
              title: 'Turkey and Cappadocia (8 Days)',
              price: 'PKR 520,000',
              note: 'Family friendly departures',
              image: 'https://images.unsplash.com/photo-1641128324605-0f6f4ed2a8f7?w=900&q=80',
            },
          ],
          customizeTitle: 'Now you can customize your package.',
          customizeText: 'Tell us your dates, destination, and budget to get a tailored quote.',
          customizeButtonText: 'Request Your Package',
          customizeButtonHref: '/contact',
        },
      },
      newsletter: {
        label: 'Tours Newsletter',
        description: 'Bottom email capture strip on tours page.',
        defaultContent: {
          title: 'Subscribe to get awesome discounts.',
          placeholder: 'Enter your email address',
          buttonText: 'Subscribe',
        },
      },
    },
  },
  hotels: {
    label: 'Hotels',
    route: '/hotels',
    sections: {
      hero: {
        label: 'Hotels Hero',
        description: 'Hotels hero heading, nav/search labels, and tabs.',
        defaultContent: {
          heading: 'Find Your Next Stay',
          subtitle: 'Search deals on hotels, homes, and much more...',
          loginButtonText: 'LOGIN / REGISTER',
          searchButtonText: 'Search...',
          navItems: [
            { label: 'Flights', href: '/flights' },
            { label: 'Hotels', href: '/hotels' },
            { label: 'Tour Packages', href: '/tours' },
            { label: 'Destinations', href: '/tours' },
            { label: 'About Us', href: '/about' },
            { label: 'Blog / Travel Tips', href: '/blog' },
            { label: 'Contact', href: '/contact' },
          ],
          tabs: [
            { id: 'flight', label: 'Flight' },
            { id: 'hotels', label: 'Hotels' },
            { id: 'umrah', label: 'Umrah' },
            { id: 'tour', label: 'Tour' },
          ],
          searchFields: {
            flight: { where: 'Departure city', dates: 'Travel date - Return date', guests: '1 Adult - Economy' },
            hotels: { where: 'Where are you going?', dates: 'Check-in date - Check-out date', guests: '2 Adult - 0 Children - 1 Room' },
            umrah: { where: 'Makkah or Madinah', dates: 'Departure date - Return date', guests: '2 Adult - 0 Children - 1 Room' },
            tour: { where: 'Select destination', dates: 'Departure date - Return date', guests: '2 Adults' },
          },
        },
      },
    },
  },
  flights: {
    label: 'Flights',
    route: '/flights',
    sections: {
      hero: {
        label: 'Flights Hero',
        description: 'Flights hero title and subtitle.',
        defaultContent: {
          breadcrumbCurrent: 'Flights',
          title: 'Book Your Flights',
          description: 'Find the best deals on domestic and international flights. Direct routes to Jeddah, Madinah, and 50+ destinations worldwide with trusted airline partners.',
        },
      },
    },
  },
  about: {
    label: 'About',
    route: '/about',
    sections: {
      hero: {
        label: 'About Hero',
        description: 'About hero title, paragraph, stats, and collage images.',
        defaultContent: {
          breadcrumbCurrent: 'About Us',
          titleLine1: 'Guiding Pilgrims',
          titleAccent: 'Since 2015',
          description: 'Ummah Travel was founded with a single mission — to make the sacred journey of Umrah accessible, comfortable, and spiritually fulfilling for every Muslim around the world. Over the years, we\'ve grown into one of the most trusted names in Islamic travel.',
          stats: [
            { value: '10+', label: 'Years' },
            { value: '5,000+', label: 'Pilgrims' },
            { value: '15+', label: 'Countries' },
            { value: '4.9★', label: 'Rating' },
          ],
          images: [
            { src: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80', alt: 'Kaaba' },
            { src: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=500&q=80', alt: 'Pilgrims' },
            { src: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=500&q=80', alt: 'Madinah' },
          ],
        },
      },
      cta: {
        label: 'About CTA',
        description: 'Bottom CTA heading, description, and buttons.',
        defaultContent: {
          heading: 'Ready to Start Your\nSacred Journey?',
          description: 'Join thousands of pilgrims who trusted Ummah Travel for their spiritual journey. Let us create a memorable Umrah experience for you.',
          primaryButtonText: 'View Packages →',
          primaryButtonHref: '/umrah-packages',
          secondaryButtonText: 'Contact Us',
          secondaryButtonHref: '#contact',
        },
      },
    },
  },
  blog: {
    label: 'Blog',
    route: '/blog',
    sections: {
      hero: {
        label: 'Blog Hero',
        description: 'Blog hero heading and intro text.',
        defaultContent: {
          breadcrumbCurrent: 'Blog & Travel Tips',
          title: 'Blog & Travel Tips',
          description: 'Expert guidance, spiritual insights, and practical travel tips to help you prepare for your sacred journey to the Holy Lands.',
        },
      },
      newsletter: {
        label: 'Blog Newsletter',
        description: 'Newsletter heading, copy, input placeholder, and bullets.',
        defaultContent: {
          heading: 'Never Miss a Travel Tip',
          description: 'Subscribe to our newsletter and get expert Umrah guides, exclusive deals, and travel inspiration delivered straight to your inbox.',
          emailPlaceholder: 'Enter your email address',
          buttonText: 'Subscribe',
          features: ['Weekly articles', 'Exclusive deals', 'No spam, ever'],
        },
      },
    },
  },
  contact: {
    label: 'Contact',
    route: '/contact',
    sections: {
      hero: {
        label: 'Contact Hero',
        description: 'Contact hero heading and support message.',
        defaultContent: {
          breadcrumbCurrent: 'Contact Us',
          title: 'Get In Touch',
          description: 'Have questions about our packages or need help planning your Umrah journey? Our team is here to assist you every step of the way.',
        },
      },
    },
  },
  'hajj-packages': {
    label: 'Hajj Packages',
    route: '/hajj-packages',
    sections: {
      hero: {
        label: 'Hajj Hero',
        description: 'Hajj hero title, badge, and stats.',
        defaultContent: {
          breadcrumbCurrent: 'Hajj Packages',
          seasonBadge: 'Hajj 2026 — Limited Spots Available',
          title: 'Hajj Packages 2026',
          description: 'Fulfill the fifth pillar of Islam with our meticulously planned Hajj packages. From economy to VIP, every package ensures your sacred journey is seamless, comfortable, and spiritually enriching.',
          stats: [
            { value: '2,000+', label: 'Pilgrims Yearly' },
            { value: '4.9', label: 'Guest Rating' },
            { value: '10+', label: 'Years Experience' },
          ],
        },
      },
      cta: {
        label: 'Hajj CTA',
        description: 'Hajj bottom CTA content and contact line.',
        defaultContent: {
          urgencyBadge: 'Limited Spots — Hajj 2026 Booking Open',
          heading: 'Secure Your Hajj\nSpot Today',
          description: 'Hajj spots fill up months in advance. Reserve your place now with just 30% deposit and pay the rest in easy installments. Our team will guide you through every step.',
          primaryButtonText: 'Reserve My Spot',
          primaryButtonHref: '/contact',
          secondaryButtonText: 'View Umrah Packages',
          secondaryButtonHref: '/umrah-packages',
          contacts: ['+92 300 123 4567', 'WhatsApp 24/7', 'hajj@ummahtravel.com'],
        },
      },
    },
  },
  'umrah-packages': {
    label: 'Umrah Packages',
    route: '/umrah-packages',
    sections: {
      hero: {
        label: 'Umrah Packages Hero',
        description: 'Hero nav, tabs, heading, search placeholders, and helper prompt.',
        defaultContent: {
          loginButtonText: 'LOGIN / REGISTER',
          loginButtonHref: '#login',
          heading: 'Customize Your\nUmrah Package 2026.',
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. Risus commodo viverra maecenas accumsan lacus vel facilisis.',
          searchButtonText: 'Search...',
          promptText: 'Not Sure Where To Go? We Got You Covered...',
          promptButtonText: 'SHOW ME OPTIONS',
          navItems: [
            { label: 'Flights', href: '/flights' },
            { label: 'Hotels', href: '/hotels' },
            { label: 'Tour Packages', href: '/tours' },
            { label: 'Destinations', href: '/tours' },
            { label: 'About Us', href: '/about' },
            { label: 'Blog / Travel Tips', href: '/blog' },
            { label: 'Contact', href: '/contact' },
          ],
          tabs: [
            { id: 'flight', label: 'Flight' },
            { id: 'hotels', label: 'Hotels' },
            { id: 'umrah', label: 'Umrah' },
            { id: 'tour', label: 'Tour' },
          ],
          fieldConfigs: {
            flight: {
              destination: 'Where are you going?',
              date: 'Check-in date - Check-out date',
              travellers: '2 Adult - 0 Children - 1 Room',
            },
            hotels: {
              destination: 'Which city are you visiting?',
              date: 'Check-in date - Check-out date',
              travellers: '2 Adult - 0 Children - 1 Room',
            },
            umrah: {
              destination: 'Where are you going?',
              date: 'Travel date - Return date',
              travellers: '2 Adult - 0 Children - 1 Room',
            },
            tour: {
              destination: 'Choose your destination',
              date: 'Departure date - Return date',
              travellers: '2 Adult - 0 Children - 1 Room',
            },
          },
        },
      },
      popularAirlines: {
        label: 'Popular Airlines',
        description: 'Umrah page airline section heading.',
        defaultContent: {
          title: 'Popular Airlines',
        },
      },
      journeyCta: {
        label: 'Journey CTA',
        description: 'Bottom CTA text block above reviews and footer.',
        defaultContent: {
          headingNormal: 'Your Umrah Journey',
          headingBold: 'Begins Here',
        },
      },
    },
  },
});

function normalizePageKey(pageKey) {
  return String(pageKey || '').trim().toLowerCase();
}

function normalizeSectionKey(sectionKey) {
  return String(sectionKey || '').trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObjectLike(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObjectLike(base)) {
    return override === undefined ? base : override;
  }

  if (!isObjectLike(override)) {
    return clone(base);
  }

  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];

    if (Array.isArray(value)) {
      merged[key] = value;
      continue;
    }

    if (isObjectLike(current) && isObjectLike(value)) {
      merged[key] = deepMerge(current, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function collectMediaIds(value, target = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectMediaIds(item, target);
    }
    return target;
  }

  if (!isObjectLike(value)) {
    return target;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if ((key === 'mediaId' || /MediaId$/i.test(key)) && typeof nestedValue === 'string' && nestedValue.trim()) {
      target.add(nestedValue.trim());
    }

    collectMediaIds(nestedValue, target);
  }

  return target;
}

function collectMediaIdsFromRecords(records) {
  const ids = new Set();

  for (const record of records) {
    collectMediaIds(record?.content || {}, ids);
  }

  return ids;
}

async function cleanupUnusedMediaIds(candidateMediaIds, records) {
  if (!candidateMediaIds || candidateMediaIds.size === 0) {
    return;
  }

  const stillReferenced = collectMediaIdsFromRecords(records);

  for (const mediaId of candidateMediaIds) {
    if (!stillReferenced.has(mediaId)) {
      await deleteMediaAsset(mediaId, { silent: true });
    }
  }
}

function ensurePageAndSection(pageKey, sectionKey = null) {
  const normalizedPageKey = normalizePageKey(pageKey);
  const pageDefinition = PAGE_CONTENT_BLUEPRINT[normalizedPageKey];

  if (!pageDefinition) {
    const error = new Error(`Unsupported page key: ${pageKey}`);
    error.statusCode = 400;
    throw error;
  }

  if (!sectionKey) {
    return { normalizedPageKey, pageDefinition, sectionDefinition: null };
  }

  const normalizedSectionKey = normalizeSectionKey(sectionKey);
  const sectionDefinition = pageDefinition.sections[normalizedSectionKey];

  if (!sectionDefinition) {
    const error = new Error(`Unsupported section key for page ${normalizedPageKey}: ${sectionKey}`);
    error.statusCode = 400;
    throw error;
  }

  return {
    normalizedPageKey,
    normalizedSectionKey,
    pageDefinition,
    sectionDefinition,
  };
}

function getSectionId(pageKey, sectionKey) {
  return `${normalizePageKey(pageKey)}.${normalizeSectionKey(sectionKey)}`;
}

async function readSnapshotRecords() {
  try {
    const fileContent = await fs.readFile(PAGE_CONTENT_FILE, 'utf8');
    const parsed = JSON.parse(fileContent);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeSnapshotRecords(records) {
  const payload = `${JSON.stringify(records, null, 2)}\n`;
  await fs.writeFile(PAGE_CONTENT_FILE, payload, 'utf8');
}

async function getOverrideCollectionOrNull() {
  const db = await getDbOrNull();
  if (!db) return null;
  return db.collection(PAGE_CONTENT_COLLECTION);
}

function removeMongoId(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const { _id, ...rest } = record;
  return rest;
}

async function readOverrideRecords() {
  const collection = await getOverrideCollectionOrNull();

  if (collection) {
    const mongoRecords = (await collection.find({}).toArray()).map(removeMongoId);

    if (mongoRecords.length > 0) {
      return mongoRecords;
    }

    const snapshot = await readSnapshotRecords();
    if (snapshot.length > 0) {
      await collection.insertMany(snapshot);
    }

    return snapshot;
  }

  return readSnapshotRecords();
}

async function writeOverrideRecords(records) {
  const normalizedRecords = Array.isArray(records) ? records : [];
  const collection = await getOverrideCollectionOrNull();

  if (collection) {
    await collection.deleteMany({});

    if (normalizedRecords.length > 0) {
      await collection.insertMany(normalizedRecords);
    }
  }

  await writeSnapshotRecords(normalizedRecords);
}

function toOverrideMap(records) {
  return records.reduce((acc, record) => {
    const id = String(record?.id || '').trim();
    if (!id) return acc;
    acc[id] = record;
    return acc;
  }, {});
}

function sectionMeta(pageKey, sectionKey, sectionDefinition, overrideRecord = null) {
  return {
    pageKey,
    sectionKey,
    label: sectionDefinition.label,
    description: sectionDefinition.description,
    hasOverride: Boolean(overrideRecord),
    updatedAt: overrideRecord?.updatedAt || null,
    updatedBy: overrideRecord?.updatedBy || null,
  };
}

async function getPageCatalog() {
  return Object.entries(PAGE_CONTENT_BLUEPRINT).map(([pageKey, pageDefinition]) => ({
    key: pageKey,
    label: pageDefinition.label,
    route: pageDefinition.route,
    sections: Object.entries(pageDefinition.sections).map(([sectionKey, sectionDefinition]) => ({
      key: sectionKey,
      label: sectionDefinition.label,
      description: sectionDefinition.description,
    })),
  }));
}

async function getPageSectionContent(pageKey, sectionKey) {
  const {
    normalizedPageKey,
    normalizedSectionKey,
    sectionDefinition,
  } = ensurePageAndSection(pageKey, sectionKey);

  const records = await readOverrideRecords();
  const overrideMap = toOverrideMap(records);
  const sectionId = getSectionId(normalizedPageKey, normalizedSectionKey);
  const overrideRecord = overrideMap[sectionId] || null;

  return {
    ...sectionMeta(normalizedPageKey, normalizedSectionKey, sectionDefinition, overrideRecord),
    content: deepMerge(sectionDefinition.defaultContent, overrideRecord?.content || {}),
  };
}

async function getPageContent(pageKey) {
  const { normalizedPageKey, pageDefinition } = ensurePageAndSection(pageKey);
  const records = await readOverrideRecords();
  const overrideMap = toOverrideMap(records);

  const sections = {};
  const sectionDetails = {};

  for (const [sectionKey, sectionDefinition] of Object.entries(pageDefinition.sections)) {
    const sectionId = getSectionId(normalizedPageKey, sectionKey);
    const overrideRecord = overrideMap[sectionId] || null;

    sections[sectionKey] = deepMerge(sectionDefinition.defaultContent, overrideRecord?.content || {});
    sectionDetails[sectionKey] = sectionMeta(normalizedPageKey, sectionKey, sectionDefinition, overrideRecord);
  }

  return {
    key: normalizedPageKey,
    label: pageDefinition.label,
    route: pageDefinition.route,
    sections,
    sectionDetails,
  };
}

async function upsertPageSectionContent({ pageKey, sectionKey, content, actor = null }) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    const error = new Error('Content payload must be a JSON object.');
    error.statusCode = 400;
    throw error;
  }

  const {
    normalizedPageKey,
    normalizedSectionKey,
  } = ensurePageAndSection(pageKey, sectionKey);

  const records = await readOverrideRecords();
  const sectionId = getSectionId(normalizedPageKey, normalizedSectionKey);
  const now = new Date().toISOString();
  const index = records.findIndex((record) => String(record.id) === sectionId);
  const currentRecord = index >= 0 ? records[index] : null;
  const previousMediaIds = collectMediaIds(currentRecord?.content || {});
  const nextMediaIds = collectMediaIds(content || {});

  const removedMediaIds = new Set(
    [...previousMediaIds].filter((mediaId) => !nextMediaIds.has(mediaId)),
  );

  const nextRecord = {
    id: sectionId,
    pageKey: normalizedPageKey,
    sectionKey: normalizedSectionKey,
    content,
    updatedAt: now,
    updatedBy: actor || null,
  };

  if (index >= 0) {
    records[index] = {
      ...records[index],
      ...nextRecord,
    };
  } else {
    records.unshift(nextRecord);
  }

  await writeOverrideRecords(records);
  await cleanupUnusedMediaIds(removedMediaIds, records);

  return getPageSectionContent(normalizedPageKey, normalizedSectionKey);
}

async function resetPageSectionContent({ pageKey, sectionKey }) {
  const {
    normalizedPageKey,
    normalizedSectionKey,
  } = ensurePageAndSection(pageKey, sectionKey);

  const sectionId = getSectionId(normalizedPageKey, normalizedSectionKey);
  const records = await readOverrideRecords();
  const removedRecord = records.find((record) => String(record.id) === sectionId) || null;
  const removedMediaIds = collectMediaIds(removedRecord?.content || {});
  const filtered = records.filter((record) => String(record.id) !== sectionId);

  if (filtered.length !== records.length) {
    await writeOverrideRecords(filtered);
    await cleanupUnusedMediaIds(removedMediaIds, filtered);
  }

  return getPageSectionContent(normalizedPageKey, normalizedSectionKey);
}

module.exports = {
  PAGE_CONTENT_BLUEPRINT,
  getPageCatalog,
  getPageContent,
  getPageSectionContent,
  resetPageSectionContent,
  upsertPageSectionContent,
};
