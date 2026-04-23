const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const ownerRoutes = require('./owner.routes');
const fieldRoutes = require('./field.routes');
const chatRoutes = require('./chat.routes');
const favorite = require('./favorite.routes');
const reviewRoutes = require('./review.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const timeSlotRoutes = require('./timeslot.routes');
const fieldPricingRuleRoutes = require('./field_pricing_rule.routes');
const maintenanceRoutes = require('./maintenance.routes');
const secureImageRoutes = require('./secureImage.routes');
const notificationRoutes = require('./notification.routes');
const revenueRoutes = require('./revenue.routes');
const promotionRoutes = require('./promotion.routes');

const adminRoutes = require('./admin.routes');

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount user routes 
router.use('/users', userRoutes);

// Mount owner routes
router.use('/owners', ownerRoutes);

// Mount field routes
router.use('/fields', fieldRoutes);


// Mount chat routes
router.use('/chats', chatRoutes);

// Mount notification routes
router.use('/notifications', notificationRoutes);

router.use('/favorites', favorite);
router.use('/reviews', reviewRoutes);

router.use('/admin', adminRoutes);

// Mount booking routes
router.use('/bookings', bookingRoutes);

// Mount payment routes
router.use('/payments', paymentRoutes);

// Mount timeslot routes
router.use('/slots', timeSlotRoutes);

// Mount field pricing rule routes
router.use('/pricing-rules', fieldPricingRuleRoutes);

// Mount maintenance routes
router.use('/maintenance', maintenanceRoutes);

// Mount secure image routes
router.use('/secure-images', secureImageRoutes);

// Mount revenue routes
router.use('/revenue', revenueRoutes);
// Mount promotion routes
router.use('/promotions', promotionRoutes);

module.exports = router;
