const Favorite = require('../models/favorite.model');
const { Field, User, Location, SubField } = require('../models');
const { successResponse, errorResponse } = require('../common/responses/apiResponse');

exports.addFavorite = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { field_id } = req.body;

    // Check if the favorite already exists
    const exist = await Favorite.findOne({ where: { user_id, field_id } });
    if (exist) {
      return errorResponse(res, 'Sân đã có trong danh sách yêu thích', 409);
    }

    const favorite = await Favorite.create({ user_id, field_id });
    return successResponse(res, 'Đã thêm vào danh sách yêu thích', favorite);
  } catch (err) {
    return errorResponse(res, 'Lỗi khi thêm yêu thích', 500, err);
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { fieldId } = req.params;

    const deleted = await Favorite.destroy({ where: { user_id, field_id: fieldId } });
    if (!deleted) {
      return errorResponse(res, 'Không tìm thấy sân trong danh sách yêu thích', 404);
    }
    return successResponse(res, 'Đã xóa khỏi danh sách yêu thích');
  } catch (err) {
    return errorResponse(res, 'Lỗi khi xóa yêu thích', 500, err);
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user_id = req.user.id;
    const favorites = await Favorite.findAll({
      where: { user_id },
      include: [
        {
          model: Field,
          as: 'field',
          include: [
            {
              model: Location,
              as: 'location',
            },
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'phone'],
            },
            {
              model: SubField,
              as: 'subfields',
              attributes: ['id', 'name', 'field_type'],
            },
          ],
          attributes: [
            'id',
            'name',
            'description',
            'price_per_hour',
            'images1',
            'images2',
            'images3',
            'is_verified',
            'created_at',
          ],
        },
      ],
    });

    // Transform the data to match the frontend's expected structure
    const favoriteFields = favorites.map((fav) => ({
      field_id: fav.field_id,
      field: {
        id: fav.field?.id || '',
        name: fav.field?.name || 'Unknown Field',
        description: fav.field?.description || 'No description available',
        price_per_hour: fav.field?.price_per_hour || 0,
        images1: fav.field?.images1 || 'https://via.placeholder.com/800x480',
        images2: fav.field?.images2 || '',
        images3: fav.field?.images3 || '',
        is_verified: fav.field?.is_verified || false,
        created_at: fav.field?.created_at || new Date().toISOString(),
        location: fav.field?.location || {
          address_text: 'Unknown',
          city: 'Unknown',
          district: 'Unknown',
          ward: 'Unknown',
        },
        owner: fav.field?.owner || {
          id: '',
          name: 'Unknown',
          phone: '',
        },
        subfields: fav.field?.subfields || [],
      },
    }));

    return successResponse(res, 'Danh sách sân yêu thích', favoriteFields);
  } catch (err) {
    return errorResponse(res, 'Lỗi khi lấy danh sách yêu thích', 500, err);
  }
};