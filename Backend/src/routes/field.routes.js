const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/field.controller');
const { authMiddleware, isOwner } = require('../middlewares/auth.middleware');
const { fieldUploadFields, handleMulterError } = require('../middlewares/fieldUploadMiddleware');

// Public routes
router.get('/search', fieldController.searchFields);
router.get('/all', fieldController.getAllFields);
router.get('/', fieldController.getFields);

// Location-based search routes
router.get('/search/location', fieldController.searchFieldsByLocation);
router.get('/nearest', fieldController.getNearestFields);
router.post('/geocode', fieldController.geocodeAddress);
router.post('/geocode/reverse', fieldController.reverseGeocodeAddress);

// Owner specific routes (must be before /:id route)
router.get('/owner/my-fields', authMiddleware, isOwner, fieldController.getOwnerFields);

// Field editing routes (owner only)
router.get('/edit/:id', authMiddleware, isOwner, fieldController.getFieldForEdit);
router.put('/:id', 
    authMiddleware, 
    isOwner, 
    fieldUploadFields,
    handleMulterError,
    fieldController.updateFieldWithFiles
);

// License management routes (owner only)
router.get('/owner/license', authMiddleware, isOwner, fieldController.getUserLicense);
router.put('/owner/license', 
    authMiddleware, 
    isOwner, 
    fieldUploadFields,
    handleMulterError,
    fieldController.updateUserLicense
);
router.delete('/owner/license/:document_type', authMiddleware, isOwner, fieldController.deleteLicenseDocument);

router.get('/:id', fieldController.getFieldDetail);

// Protected routes (require authentication)
router.post('/', authMiddleware, isOwner, fieldController.addField);

// New route for adding field with file uploads
router.post('/with-files', 
    authMiddleware, 
    isOwner, 
    fieldUploadFields,
    handleMulterError,
    fieldController.addFieldWithFiles
);

module.exports = router;