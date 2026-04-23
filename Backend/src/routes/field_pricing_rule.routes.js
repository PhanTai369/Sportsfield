const express = require('express');
const fieldPricingRuleController = require('../controllers/field_pricing_rule.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// API tạo quy tắc giá mới
router.post(
  '/',
  authMiddleware,
  fieldPricingRuleController.createPricingRule
);

// API lấy danh sách quy tắc giá của một field
router.get(
  '/field/:fieldId',
  fieldPricingRuleController.getPricingRulesByField
);

// API lấy giá cho một khung giờ cụ thể
router.get(
  '/field/:fieldId/price',
  authMiddleware,
  fieldPricingRuleController.getPriceForHour
);

// API bulk tạo quy tắc giá
router.post(
  '/bulk',
  authMiddleware,
  fieldPricingRuleController.bulkCreatePricingRules
);

// API cập nhật quy tắc giá
router.put(
  '/:ruleId',
  authMiddleware,
  fieldPricingRuleController.updatePricingRule
);

// API xóa quy tắc giá
router.delete(
  '/:ruleId',
  authMiddleware,
  fieldPricingRuleController.deletePricingRule
);

module.exports = router;
