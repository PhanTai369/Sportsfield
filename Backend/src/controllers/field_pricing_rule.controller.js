const { FieldPricingRule, Field } = require('../models');
const responseFormatter = require('../utils/responseFormatter');
const { Op } = require('sequelize');

/**
 * API tạo quy tắc giá mới
 * POST /api/pricing-rules
 */
const createPricingRule = async (req, res) => {
  try {
    const { field_id, from_hour, to_hour, multiplier } = req.body;

    // Validate input
    if (!field_id || from_hour === undefined || to_hour === undefined) {
      return res.status(400).json(responseFormatter.error('Missing required fields', 400));
    }

    if (from_hour < 0 || from_hour > 23 || to_hour < 0 || to_hour > 23) {
      return res.status(400).json(responseFormatter.error('Invalid hour range (0-23)', 400));
    }

    if (from_hour >= to_hour) {
      return res.status(400).json(responseFormatter.error('from_hour must be less than to_hour', 400));
    }

    // Check if field exists
    const field = await Field.findByPk(field_id);
    if (!field) {
      return res.status(404).json(responseFormatter.error('Field not found', 404));
    }

    // Check for overlapping time ranges
    const overlapping = await FieldPricingRule.findOne({
      where: {
        field_id,
        [Op.or]: [
          {
            from_hour: { [Op.lt]: to_hour },
            to_hour: { [Op.gt]: from_hour }
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json(responseFormatter.error('Time range overlaps with existing rule', 400));
    }

    const pricingRule = await FieldPricingRule.create({
      field_id,
      from_hour,
      to_hour,
      multiplier: multiplier || 1.0
    });

    return res.status(201).json(responseFormatter.success(pricingRule, 'Pricing rule created successfully', 201));
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error creating pricing rule', 500));
  }
};

/**
 * API lấy danh sách quy tắc giá của một field
 * GET /api/pricing-rules/field/:fieldId
 */
const getPricingRulesByField = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const pricingRules = await FieldPricingRule.findAll({
      where: { field_id: fieldId },
      order: [['from_hour', 'ASC']]
    });

    return res.json(responseFormatter.success(pricingRules, 'Pricing rules retrieved successfully'));
  } catch (error) {
    console.error('Error getting pricing rules:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error getting pricing rules', 500));
  }
};

/**
 * API cập nhật quy tắc giá
 * PUT /api/pricing-rules/:ruleId
 */
const updatePricingRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { from_hour, to_hour, multiplier } = req.body;

    const pricingRule = await FieldPricingRule.findByPk(ruleId);
    if (!pricingRule) {
      return res.status(404).json(responseFormatter.error('Pricing rule not found', 404));
    }

    // Validate hours if provided
    if (from_hour !== undefined && (from_hour < 0 || from_hour > 23)) {
      return res.status(400).json(responseFormatter.error('Invalid from_hour (0-23)', 400));
    }

    if (to_hour !== undefined && (to_hour < 0 || to_hour > 23)) {
      return res.status(400).json(responseFormatter.error('Invalid to_hour (0-23)', 400));
    }

    const newFromHour = from_hour !== undefined ? from_hour : pricingRule.from_hour;
    const newToHour = to_hour !== undefined ? to_hour : pricingRule.to_hour;

    if (newFromHour >= newToHour) {
      return res.status(400).json(responseFormatter.error('from_hour must be less than to_hour', 400));
    }

    // Check for overlapping with other rules (exclude current rule)
    const overlapping = await FieldPricingRule.findOne({
      where: {
        field_id: pricingRule.field_id,
        id: { [Op.ne]: ruleId },
        [Op.or]: [
          {
            from_hour: { [Op.lt]: newToHour },
            to_hour: { [Op.gt]: newFromHour }
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json(responseFormatter.error('Time range overlaps with existing rule', 400));
    }

    // Update the rule
    await pricingRule.update({
      from_hour: newFromHour,
      to_hour: newToHour,
      multiplier: multiplier !== undefined ? multiplier : pricingRule.multiplier
    });

    return res.json(responseFormatter.success(pricingRule, 'Pricing rule updated successfully'));
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error updating pricing rule', 500));
  }
};

/**
 * API xóa quy tắc giá
 * DELETE /api/pricing-rules/:ruleId
 */
const deletePricingRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    const pricingRule = await FieldPricingRule.findByPk(ruleId);
    if (!pricingRule) {
      return res.status(404).json(responseFormatter.error('Pricing rule not found', 404));
    }

    await pricingRule.destroy();

    return res.json(responseFormatter.success(null, 'Pricing rule deleted successfully'));
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error deleting pricing rule', 500));
  }
};

/**
 * API lấy giá cho một khung giờ cụ thể
 * GET /api/pricing-rules/field/:fieldId/price?hour=17
 */
const getPriceForHour = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { hour } = req.query;

    if (!hour || hour < 0 || hour > 23) {
      return res.status(400).json(responseFormatter.error('Invalid hour parameter (0-23)', 400));
    }

    // Get field base price
    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json(responseFormatter.error('Field not found', 404));
    }

    const basePrice = parseFloat(field.price_per_hour) || 0;

    // Find applicable pricing rule
    const pricingRule = await FieldPricingRule.findOne({
      where: {
        field_id: fieldId,
        from_hour: { [Op.lte]: hour },
        to_hour: { [Op.gt]: hour }
      }
    });

    const multiplier = pricingRule ? parseFloat(pricingRule.multiplier) : 1.0;
    const finalPrice = basePrice * multiplier;

    return res.json(responseFormatter.success({
      field_id: fieldId,
      hour: parseInt(hour),
      base_price: basePrice,
      multiplier,
      final_price: finalPrice,
      pricing_rule: pricingRule
    }, 'Price calculated successfully'));
  } catch (error) {
    console.error('Error calculating price for hour:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error calculating price', 500));
  }
};

/**
 * API bulk tạo quy tắc giá (ví dụ: giờ cao điểm)
 * POST /api/pricing-rules/bulk
 */
const bulkCreatePricingRules = async (req, res) => {
  try {
    const { field_id, rules } = req.body;

    if (!field_id || !Array.isArray(rules)) {
      return res.status(400).json(responseFormatter.error('field_id and rules array are required', 400));
    }

    // Check if field exists
    const field = await Field.findByPk(field_id);
    if (!field) {
      return res.status(404).json(responseFormatter.error('Field not found', 404));
    }

    // Validate all rules
    for (const rule of rules) {
      const { from_hour, to_hour } = rule;
      if (from_hour === undefined || to_hour === undefined || from_hour >= to_hour) {
        return res.status(400).json(responseFormatter.error('Invalid rule format', 400));
      }
    }

    // Clear existing rules for this field
    await FieldPricingRule.destroy({ where: { field_id } });

    // Create new rules
    const pricingRules = await FieldPricingRule.bulkCreate(
      rules.map(rule => ({
        field_id,
        from_hour: rule.from_hour,
        to_hour: rule.to_hour,
        multiplier: rule.multiplier || 1.0
      }))
    );

    return res.status(201).json(responseFormatter.success(pricingRules, 'Pricing rules created successfully', 201));
  } catch (error) {
    console.error('Error bulk creating pricing rules:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Error creating pricing rules', 500));
  }
};

module.exports = {
  createPricingRule,
  getPricingRulesByField,
  updatePricingRule,
  deletePricingRule,
  getPriceForHour,
  bulkCreatePricingRules
};
