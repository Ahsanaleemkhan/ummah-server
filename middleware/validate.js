const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value) {
                if (rules.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`${field} must be a valid email address`);
                    }
                }

                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }

                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must be at most ${rules.maxLength} characters`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        next();
    };
};

// Validation schemas
const registerSchema = {
    name: { required: true, minLength: 2, maxLength: 50 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
};

const loginSchema = {
    email: { required: true, type: 'email' },
    password: { required: true },
};

const bookingSchema = {
    name: { required: true, minLength: 2 },
    email: { required: true, type: 'email' },
    phone: { required: true, minLength: 10 },
    packageId: { required: true },
};

module.exports = { validate, registerSchema, loginSchema, bookingSchema };
