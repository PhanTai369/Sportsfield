const { Field, User, Location, SubField } = require('../models');
const { ValidationError, Op, Sequelize } = require('sequelize');
const responseFormatter = require('../utils/responseFormatter');
const sequelize = require('sequelize');
const { uploadImage } = require('../config/s3Config');
const geocodingService = require('../services/geocoding.enhanced');
const logger = require('../utils/logger');
const { getFieldQueryWithPackageValidation } = require('../middlewares/packageValidation.middleware');

// Get all fields with pagination
const getAllFields = async (req, res) => {
    try {
        // Get pagination params from request query
        const limit = parseInt(req.query.limit) || 3; // Default to 3 items
        const offset = parseInt(req.query.offset) || 0; // Default to first page

        // Use findAndCountAll to get both the rows and total count
        const { rows: fields, count: totalCount } = await Field.findAndCountAll({
            where: {
                is_verified: true
            },
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone', 'package_type', 'package_expire_date'],
                    where: {
                        [Op.and]: [
                            { package_type: { [Op.ne]: 'none' } },
                            {
                                [Op.or]: [
                                    { package_expire_date: { [Op.gte]: new Date() } },
                                    { package_expire_date: { [Op.is]: null } }
                                ]
                            }
                        ]
                    }
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type']
                }
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
                'created_at'
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return res.json({
            success: true,
            data: {
                fields,
                pagination: {
                    total: totalCount,
                    offset,
                    limit,
                    hasMore: offset + fields.length < totalCount
                }
            }
        });
    } catch (error) {
        console.error('Error in getAllFields:', error);
        logger.error('Error in getAllFields:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy danh sách sân',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Get list of fields with simple pagination (10 items per page)
const getFields = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Fixed limit of 10 items
        const offset = (page - 1) * limit;

        const { count, rows } = await Field.findAndCountAll({
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['name']
                }
            ],
            limit,
            offset,
            attributes: ['id', 'name', 'price_per_hour', 'images1','images2','images3', 'is_verified', 'created_at'],
            order: [['created_at', 'DESC']] // Default sort by newest first
        });

        const totalPages = Math.ceil(count / limit);

        return res.json({
            success: true,
            data: {
                items: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    total_pages: totalPages
                }
            }
        });
    } catch (error) {
        console.error('Error in getFields:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy danh sách sân',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Add new field
const addField = async (req, res) => {
    try {
        const { name, location_id, description, price_per_hour, images1, images2, images3 } = req.body;
        const owner_id = req.user.id; // Get from authenticated user

        // Validate required fields
        if (!name || !location_id || !price_per_hour) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Dữ liệu không hợp lệ',
                details: {
                    name: !name ? 'Tên sân không được để trống' : undefined,
                    location_id: !location_id ? 'ID địa điểm không được để trống' : undefined,
                    price_per_hour: !price_per_hour ? 'Giá tiền không được để trống' : undefined
                }
            }));
        }

        // Validate price
        if (price_per_hour <= 0) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Giá tiền phải là số dương'
            }));
        }

        // Check if location exists
        const location = await Location.findByPk(location_id);
        if (!location) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Địa điểm không tồn tại'
            }));
        }

        const field = await Field.create({
            owner_id,
            name,
            location_id,
            description,
            price_per_hour,
            images1,
            images2,
            images3
        });

        return res.json(responseFormatter.success(field));
    } catch (error) {
        console.error('Error in addField:', error);
        if (error instanceof ValidationError) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Dữ liệu không hợp lệ',
                details: error.errors.reduce((acc, curr) => {
                    acc[curr.path] = curr.message;
                    return acc;
                }, {})
            }));
        }
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra'
        }));
    }
};

// Add new field with file upload support
const addFieldWithFiles = async (req, res) => {
    try {
        console.log('=== addFieldWithFiles START ===');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
        
        const { 
            name, 
            location, 
            address, 
            field_type, 
            sub_field_count, 
            description, 
            price_per_hour,
            city,
            district,
            ward
        } = req.body;
        const owner_id = req.user.id; // Get from authenticated user

        console.log('Parsed data:', { 
            name, location, address, field_type, sub_field_count, 
            price_per_hour, city, district, ward, owner_id 
        });        // Validate required fields
        if (!name || !location || !address || !field_type || !sub_field_count || !price_per_hour) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Dữ liệu không hợp lệ',
                details: {
                    name: !name ? 'Tên sân không được để trống' : undefined,
                    location: !location ? 'Quận/huyện không được để trống' : undefined,
                    address: !address ? 'Địa chỉ không được để trống' : undefined,
                    field_type: !field_type ? 'Loại sân không được để trống' : undefined,
                    sub_field_count: !sub_field_count ? 'Số lượng sân con không được để trống' : undefined,
                    price_per_hour: !price_per_hour ? 'Giá tiền không được để trống' : undefined
                }
            }));
        }

        // Validate price
        if (price_per_hour <= 0) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Giá tiền phải là số dương'
            }));
        }        // Validate field_type
        const validFieldTypes = ['5vs5', '7vs7'];
        if (!validFieldTypes.includes(field_type)) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Loại sân không hợp lệ. Chỉ chấp nhận 5vs5 hoặc 7vs7'
            }));
        }        // Validate sub_field_count
        const subFieldCount = parseInt(sub_field_count);
        if (isNaN(subFieldCount) || subFieldCount < 1 || subFieldCount > 10) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Số lượng sân con phải từ 1 đến 10'
            }));        }        // Lấy thông tin user hiện tại để kiểm tra giấy tờ đã có
        const currentUser = await User.findByPk(owner_id, {
            attributes: ['id', 'business_license_image', 'identity_card_image', 'identity_card_back_image']
        });

        if (!currentUser) {
            return res.status(404).json(responseFormatter.error({
                code: 'USER_NOT_FOUND',
                message: 'Không tìm thấy thông tin người dùng'
            }));
        }

        // Validate required images and documents
        const uploadedFiles = req.files;
        console.log('Uploaded files check:', uploadedFiles);
        console.log('Current user documents:', {
            business_license: !!currentUser.business_license_image,
            identity_card: !!currentUser.identity_card_image,
            identity_card_back: !!currentUser.identity_card_back_image
        });
        
        // Kiểm tra 3 ảnh sân bóng bắt buộc
        if (!uploadedFiles || !uploadedFiles.image1 || !uploadedFiles.image2 || !uploadedFiles.image3) {
            console.log('Missing field images validation failed');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Cần phải upload đúng 3 ảnh sân bóng'
            }));
        }

        // Kiểm tra ảnh CCCD mặt trước (upload mới hoặc đã có sẵn)
        if (!uploadedFiles.identity_card_image && !currentUser.identity_card_image) {
            console.log('Missing identity card front image');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Cần phải upload ảnh mặt trước CCCD/CMND'
            }));
        }

        // Kiểm tra ảnh CCCD mặt sau (upload mới hoặc đã có sẵn)
        if (!uploadedFiles.identity_card_back_image && !currentUser.identity_card_back_image) {
            console.log('Missing identity card back image');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Cần phải upload ảnh mặt sau CCCD/CMND'
            }));
        }

        // Kiểm tra giấy phép kinh doanh (upload mới hoặc đã có sẵn)
        if (!uploadedFiles.business_license_image && !currentUser.business_license_image) {
            console.log('Missing business license image');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Cần phải upload ảnh giấy phép kinh doanh'
            }));
        }// Handle uploaded files with S3
        let images1 = null, images2 = null, images3 = null;
        let businessLicenseUrl = null, identityCardUrl = null, identityCardBackUrl = null;

        if (uploadedFiles) {
            try {
                // Handle field images upload to S3
                if (uploadedFiles.image1) {
                    const result1 = await uploadImage(uploadedFiles.image1[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image1_${Date.now()}`
                    });
                    images1 = result1.secure_url;
                }
                if (uploadedFiles.image2) {
                    const result2 = await uploadImage(uploadedFiles.image2[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image2_${Date.now()}`
                    });
                    images2 = result2.secure_url;
                }
                if (uploadedFiles.image3) {
                    const result3 = await uploadImage(uploadedFiles.image3[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image3_${Date.now()}`
                    });
                    images3 = result3.secure_url;
                }
                
                // Handle business documents upload to S3 (as private documents)
                if (uploadedFiles.business_license_image) {
                    const businessResult = await uploadImage(uploadedFiles.business_license_image[0].buffer, {
                        folder: 'secure_documents/business_licenses',
                        public_id: `business_license_${owner_id}_${Date.now()}`,
                        secure: true, // Mark as secure/private document
                        type: 'private'
                    });
                    businessLicenseUrl = businessResult.secure_url;
                    console.log('Uploaded business license to private S3 path:', businessLicenseUrl);
                }
                
                if (uploadedFiles.identity_card_image) {
                    const identityResult = await uploadImage(uploadedFiles.identity_card_image[0].buffer, {
                        folder: 'secure_documents/identity_cards',
                        public_id: `identity_card_${owner_id}_${Date.now()}`,
                        secure: true, // Mark as secure/private document
                        type: 'private'
                    });
                    identityCardUrl = identityResult.secure_url;
                    console.log('Uploaded identity card front to private S3 path:', identityCardUrl);
                }
                
                if (uploadedFiles.identity_card_back_image) {
                    const identityBackResult = await uploadImage(uploadedFiles.identity_card_back_image[0].buffer, {
                        folder: 'secure_documents/identity_cards',
                        public_id: `identity_card_back_${owner_id}_${Date.now()}`,
                        secure: true, // Mark as secure/private document
                        type: 'private'
                    });
                    identityCardBackUrl = identityBackResult.secure_url;
                    console.log('Uploaded identity card back to private S3 path:', identityCardBackUrl);
                }
            } catch (uploadError) {
                console.error('Error uploading to S3:', uploadError);
                return res.status(500).json(responseFormatter.error({
                    code: 'UPLOAD_ERROR',
                    message: 'Lỗi khi upload ảnh lên S3',
                    details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
                }));
            }
        }        // Create or get location with geocoding
        let locationRecord;
        
        // Try to find existing location with same address
        const fullAddress = `${address}, ${district}, ${city}`;
        const existingLocation = await Location.findOne({
            where: {
                address_text: address,
                city: city,
                district: district,
                ward: ward || null
            }
        });

        if (existingLocation) {
            locationRecord = existingLocation;
            console.log('Using existing location:', locationRecord.id);
        } else {
            // Create new location with geocoding
            try {
                console.log('Geocoding address:', fullAddress);
                const geocodeResult = await geocodingService.geocodeAddress(fullAddress);
                
                locationRecord = await Location.create({
                    address_text: address,
                    formatted_address: geocodeResult.formattedAddress,
                    city: city,
                    district: district,
                    ward: ward,
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude,
                    country: geocodeResult.country,
                    country_code: geocodeResult.countryCode
                });
                
                console.log('Created new location with coordinates:', {
                    id: locationRecord.id,
                    lat: geocodeResult.latitude,
                    lon: geocodeResult.longitude
                });
            } catch (geocodeError) {
                console.log('Geocoding failed, creating location without coordinates:', geocodeError.message);
                
                // Create location without coordinates if geocoding fails
                locationRecord = await Location.create({
                    address_text: address,
                    city: city,
                    district: district,
                    ward: ward,
                    latitude: null,
                    longitude: null
                });
                
                console.log('Created location without coordinates:', locationRecord.id);
            }
        }

        // Create field
        const field = await Field.create({
            owner_id,
            name,
            location_id: locationRecord.id,
            description,
            price_per_hour,
            images1,
            images2,
            images3,
            is_verified: false // Needs admin verification
        });        // Create SubFields based on sub_field_count with alphabet naming
        const subFields = [];
        for (let i = 1; i <= subFieldCount; i++) {
            // Convert number to alphabet (1 = A, 2 = B, etc.)
            const alphabetLetter = String.fromCharCode(64 + i); // 65 is 'A', so 64 + 1 = 65 = 'A'
            const subField = await SubField.create({
                field_id: field.id,
                name: ` Sân ${alphabetLetter}`,
                field_type: field_type,
                image: images1 // Use first image as default for all subfields
            });
            subFields.push(subField);
        }        // Update user with business documents (chỉ update những file được upload mới)
        const updateData = {};
        
        // Sử dụng URL mới nếu có upload, nếu không thì giữ nguyên URL cũ
        if (businessLicenseUrl) {
            updateData.business_license_image = businessLicenseUrl;
        } else if (!currentUser.business_license_image) {
            console.error('No business license image available (neither uploaded nor existing)');
            return res.status(500).json(responseFormatter.error({
                code: 'DOCUMENT_ERROR',
                message: 'Không có ảnh giấy phép kinh doanh'
            }));
        }
        
        if (identityCardUrl) {
            updateData.identity_card_image = identityCardUrl;
        } else if (!currentUser.identity_card_image) {
            console.error('No identity card front image available (neither uploaded nor existing)');
            return res.status(500).json(responseFormatter.error({
                code: 'DOCUMENT_ERROR',
                message: 'Không có ảnh mặt trước CCCD'
            }));
        }
        
        if (identityCardBackUrl) {
            updateData.identity_card_back_image = identityCardBackUrl;
        } else if (!currentUser.identity_card_back_image) {
            console.error('No identity card back image available (neither uploaded nor existing)');
            return res.status(500).json(responseFormatter.error({
                code: 'DOCUMENT_ERROR',
                message: 'Không có ảnh mặt sau CCCD'
            }));
        }
        
        // Chỉ update nếu có dữ liệu mới
        if (Object.keys(updateData).length > 0) {
            await User.update(updateData, {
                where: { id: owner_id }
            });
            console.log('Updated user documents:', updateData);
        } else {
            console.log('No new documents to update, using existing ones');        }
        
        // Fetch created field with relationships including SubFields
        const createdField = await Field.findByPk(field.id, {
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type', 'image']
                }
            ]
        });

        return res.status(201).json(responseFormatter.success({
            message: 'Sân bóng đã được tạo thành công và đang chờ xét duyệt',
            data: {
                field: createdField,
                subFields: subFields,
                totalSubFields: subFieldCount
            }
        }));    } catch (error) {
        console.error('Error in addFieldWithFiles:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi tạo sân bóng',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};

// Update field with file uploads (owner only) - Sets is_verified to false for re-approval
const updateFieldWithFiles = async (req, res) => {
    try {
        console.log('=== updateFieldWithFiles START ===');
        console.log('Field ID:', req.params.id);
        console.log('Request body:', req.body);
        console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
        
        const fieldId = req.params.id;
        const { 
            name, 
            location, 
            address, 
            field_type, 
            sub_field_count, 
            description, 
            price_per_hour,
            city,
            district,
            ward
        } = req.body;
        const owner_id = req.user.id; // Get from authenticated user
        const uploadedFiles = req.files;

        // Find existing field and verify ownership
        const existingField = await Field.findOne({
            where: { 
                id: fieldId,
                owner_id: owner_id // Ensure owner can only edit their own fields
            },
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['id']
                }
            ]
        });

        if (!existingField) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Không tìm thấy sân bóng hoặc bạn không có quyền chỉnh sửa'
            }));
        }

        console.log('Found existing field:', existingField.name);

        // Validate required fields
        if (!name || !location || !address || !field_type || !sub_field_count || !price_per_hour) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Dữ liệu không hợp lệ',
                details: {
                    name: !name ? 'Tên sân không được để trống' : undefined,
                    location: !location ? 'Quận/huyện không được để trống' : undefined,
                    address: !address ? 'Địa chỉ không được để trống' : undefined,
                    field_type: !field_type ? 'Loại sân không được để trống' : undefined,
                    sub_field_count: !sub_field_count ? 'Số lượng sân con không được để trống' : undefined,
                    price_per_hour: !price_per_hour ? 'Giá tiền không được để trống' : undefined
                }
            }));
        }

        // Validate price
        if (price_per_hour <= 0) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Giá tiền phải là số dương'
            }));
        }

        // Validate field_type
        const validFieldTypes = ['5vs5', '7vs7'];
        if (!validFieldTypes.includes(field_type)) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Loại sân không hợp lệ. Chỉ chấp nhận 5vs5 hoặc 7vs7'
            }));
        }

        // Validate sub_field_count
        const subFieldCount = parseInt(sub_field_count);
        if (isNaN(subFieldCount) || subFieldCount < 1 || subFieldCount > 10) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Số lượng sân con phải từ 1 đến 10'
            }));
        }

        // Initialize image URLs with existing values
        let images1 = existingField.images1;
        let images2 = existingField.images2;
        let images3 = existingField.images3;

        // Handle image uploads if provided
        if (uploadedFiles) {
            console.log('Processing file uploads...');
            
            try {
                // Upload new images to S3
                if (uploadedFiles.image1) {
                    const result1 = await uploadImage(uploadedFiles.image1[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image1_${Date.now()}`
                    });
                    images1 = result1.secure_url;
                }
                if (uploadedFiles.image2) {
                    const result2 = await uploadImage(uploadedFiles.image2[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image2_${Date.now()}`
                    });
                    images2 = result2.secure_url;
                }
                if (uploadedFiles.image3) {
                    const result3 = await uploadImage(uploadedFiles.image3[0].buffer, {
                        folder: 'fields',
                        public_id: `field_${owner_id}_image3_${Date.now()}`
                    });
                    images3 = result3.secure_url;
                }
            } catch (uploadError) {
                console.error('Error uploading to S3:', uploadError);
                return res.status(500).json(responseFormatter.error({
                    code: 'UPLOAD_ERROR',
                    message: 'Lỗi khi upload ảnh lên S3',
                    details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
                }));
            }
        }

        // Update location
        await Location.update({
            address_text: address,
            city: city || 'Đà Nẵng',
            district: district || location,
            ward: ward || 'Thuận Thành'
        }, {
            where: { id: existingField.location.id }
        });

        // Update field - IMPORTANT: Set is_verified to false for re-approval
        const updatedField = await Field.update({
            name,
            description,
            price_per_hour,
            images1,
            images2,
            images3,
            is_verified: false // This field needs re-approval after editing
        }, {
            where: { id: fieldId },
            returning: true
        });

        // Update SubFields if field type or count changed
        const currentSubFields = await SubField.findAll({
            where: { field_id: fieldId }
        });

        // If sub field count changed, recreate subfields
        if (currentSubFields.length !== subFieldCount) {
            // Delete existing subfields
            await SubField.destroy({ where: { field_id: fieldId } });
            
            // Create new subfields
            const subFields = [];
            for (let i = 1; i <= subFieldCount; i++) {
                const alphabetLetter = String.fromCharCode(64 + i);
                const subField = await SubField.create({
                    field_id: fieldId,
                    name: `Sân ${alphabetLetter}`,
                    field_type: field_type,
                    image: images1
                });
                subFields.push(subField);
            }
        } else {
            // Just update field type if it changed
            await SubField.update({
                field_type: field_type,
                image: images1
            }, {
                where: { field_id: fieldId }
            });
        }

        // Fetch updated field with relationships
        const updatedFieldData = await Field.findByPk(fieldId, {
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type', 'image']
                }
            ]
        });

        return res.json(responseFormatter.success({
            message: 'Cập nhật sân bóng thành công. Sân đang chờ xét duyệt lại.',
            data: {
                field: updatedFieldData,
                verification_required: true,
                updated_images: {
                    images1: images1 !== existingField.images1,
                    images2: images2 !== existingField.images2,
                    images3: images3 !== existingField.images3
                }
            }
        }));

    } catch (error) {
        console.error('Error in updateFieldWithFiles:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi cập nhật sân bóng',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};

// Get field detail
const getFieldDetail = async (req, res) => {
    try {
        const fieldId = req.params.id;

        const field = await Field.findByPk(fieldId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: Location,
                    as: 'location',
                    attributes: ['id', 'address_text', 'latitude', 'longitude', 'city', 'district', 'ward']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type']
                }
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
                'updated_at'
            ]
        });

        if (!field) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Không tìm thấy sân bóng'
                }
            });
        }

        return res.json({
            success: true,
            data: field
        });
    } catch (error) {
        console.error('Error in getFieldDetail:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy thông tin sân',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Search fields by name
const searchFields = async (req, res) => {
    try {
        let { name, field_type } = req.query;
        
        // Kiểm tra ít nhất một trong hai tiêu chí tìm kiếm được cung cấp
        if (!name && !field_type) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Vui lòng nhập tên sân hoặc chọn loại sân cần tìm'
                }
            });
        }

        // Chuẩn hóa chuỗi tìm kiếm nếu có
        if (name) {
            name = decodeURIComponent(name).trim();
            console.log('Search term name after decode:', name);
        }
        
        if (field_type) {
            field_type = decodeURIComponent(field_type).trim();
            console.log('Search term field_type after decode:', field_type);
        }

        // Xây dựng điều kiện WHERE
        let whereCondition = {
            is_verified: true // Chỉ tìm các sân đã được xác minh
        };
        
        // Điều kiện tìm theo tên sân
        if (name) {
            whereCondition.name = {
                [Op.iLike]: `%${name}%`
            };
        }

        // Thiết lập include cho các mối quan hệ
        const includeModels = [
            {
                model: Location,
                as: 'location',
                attributes: ['address_text', 'city', 'district', 'ward']
            },
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'phone']
            }
        ];
        
        // Điều kiện cho subfields (loại sân)
        if (field_type) {
            includeModels.push({
                model: SubField,
                as: 'subfields',
                where: {
                    field_type: field_type
                },
                attributes: ['id', 'name', 'field_type']
            });
        } else {
            includeModels.push({
                model: SubField,
                as: 'subfields',
                attributes: ['id', 'name', 'field_type']
            });
        }

        const fields = await Field.findAll({
            where: whereCondition,
            include: includeModels,
            attributes: [
                'id', 
                'name', 
                'description', 
                'price_per_hour', 
                'images1', 
                'images2', 
                'images3', 
                'is_verified', 
                'created_at'
            ],
            order: [['created_at', 'DESC']]
        });

        console.log('Found fields:', fields.map(f => f.name));

        return res.json({
            success: true,
            data: fields
        });
    } catch (error) {
        console.error('Error in searchFields:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi tìm kiếm sân',
                details: error.message
            }
        });
    }
};

// Get fields owned by authenticated owner
const getOwnerFields = async (req, res) => {
    try {
        const ownerId = req.user.id; // Get owner ID from authenticated user

        const fields = await Field.findAll({
            where: {
                owner_id: ownerId
            },
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type']
                }
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
                'updated_at'
            ],
            order: [['created_at', 'DESC']]
        });

        return res.json({
            success: true,
            data: fields
        });
    } catch (error) {
        console.error('Error in getOwnerFields:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy danh sách sân của owner',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Get user license information
const getUserLicense = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from authenticated user

        const user = await User.findByPk(userId, {
            attributes: [
                'id', 
                'name', 
                'email', 
                'business_license_image',
                'identity_card_image',
                'identity_card_back_image',
                'created_at',
                'updated_at'
            ]
        });

        if (!user) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Không tìm thấy thông tin người dùng'
            }));
        }

        // Check if user has complete license documentation
        const hasBusinessLicense = !!user.business_license_image;
        const hasIdentityCardFront = !!user.identity_card_image;
        const hasIdentityCardBack = !!user.identity_card_back_image;
        const hasCompleteLicense = hasBusinessLicense && hasIdentityCardFront && hasIdentityCardBack;

        return res.json(responseFormatter.success({
            license: {
                business_license_image: user.business_license_image,
                identity_card_image: user.identity_card_image,
                identity_card_back_image: user.identity_card_back_image,
                has_complete_license: hasCompleteLicense,
                has_business_license: hasBusinessLicense,
                has_identity_card_front: hasIdentityCardFront,
                has_identity_card_back: hasIdentityCardBack,
                last_updated: user.updated_at
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        }));
    } catch (error) {
        console.error('Error in getUserLicense:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy thông tin giấy phép',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};

// Update user license documents
const updateUserLicense = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from authenticated user
        const uploadedFiles = req.files;

        console.log('=== updateUserLicense START ===');
        console.log('User ID:', userId);
        console.log('Uploaded files:', uploadedFiles ? Object.keys(uploadedFiles) : 'No files');

        // Check if at least one file is uploaded
        if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Cần phải upload ít nhất một tài liệu'
            }));
        }

        // Validate file types (optional specific validation)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        for (const [fieldName, files] of Object.entries(uploadedFiles)) {
            if (files && files[0] && !allowedTypes.includes(files[0].mimetype)) {
                return res.status(400).json(responseFormatter.error({
                    code: 'VALIDATION_ERROR',
                    message: `File ${fieldName} phải là ảnh (JPG, JPEG, PNG, GIF)`
                }));
            }
        }

        // Get current user data
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Không tìm thấy thông tin người dùng'
            }));
        }

        // Prepare update data object
        const updateData = {};
        const uploadResults = {};

        try {
            // Handle business license upload
            if (uploadedFiles.business_license_image) {
                const businessResult = await uploadImage(uploadedFiles.business_license_image[0].buffer, {
                    folder: 'secure_documents/business_licenses',
                    public_id: `business_license_${userId}_${Date.now()}`
                });
                updateData.business_license_image = businessResult.secure_url;
                uploadResults.business_license = businessResult.secure_url;
            }

            // Handle identity card front upload
            if (uploadedFiles.identity_card_image) {
                const identityResult = await uploadImage(uploadedFiles.identity_card_image[0].buffer, {
                    folder: 'secure_documents/identity_cards',
                    public_id: `identity_card_front_${userId}_${Date.now()}`
                });
                updateData.identity_card_image = identityResult.secure_url;
                uploadResults.identity_card_front = identityResult.secure_url;
            }

            // Handle identity card back upload
            if (uploadedFiles.identity_card_back_image) {
                const identityBackResult = await uploadImage(uploadedFiles.identity_card_back_image[0].buffer, {
                    folder: 'secure_documents/identity_cards',
                    public_id: `identity_card_back_${userId}_${Date.now()}`
                });
                updateData.identity_card_back_image = identityBackResult.secure_url;
                uploadResults.identity_card_back = identityBackResult.secure_url;
            }
        } catch (uploadError) {
            console.error('Error uploading to S3:', uploadError);
            return res.status(500).json(responseFormatter.error({
                code: 'UPLOAD_ERROR',
                message: 'Lỗi khi upload ảnh lên S3',
                details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
            }));
        }

        // Update user with new document URLs
        if (Object.keys(updateData).length > 0) {
            await User.update(updateData, {
                where: { id: userId }
            });

            // Get updated user data
            const updatedUser = await User.findByPk(userId, {
                attributes: [
                    'id', 
                    'name', 
                    'email', 
                    'business_license_image',
                    'identity_card_image',
                    'identity_card_back_image',
                    'updated_at'
                ]
            });

            // Check completion status
            const hasBusinessLicense = !!updatedUser.business_license_image;
            const hasIdentityCardFront = !!updatedUser.identity_card_image;
            const hasIdentityCardBack = !!updatedUser.identity_card_back_image;
            const hasCompleteLicense = hasBusinessLicense && hasIdentityCardFront && hasIdentityCardBack;

            return res.json(responseFormatter.success({
                message: 'Cập nhật tài liệu thành công',
                license: {
                    business_license_image: updatedUser.business_license_image,
                    identity_card_image: updatedUser.identity_card_image,
                    identity_card_back_image: updatedUser.identity_card_back_image,
                    has_complete_license: hasCompleteLicense,
                    has_business_license: hasBusinessLicense,
                    has_identity_card_front: hasIdentityCardFront,
                    has_identity_card_back: hasIdentityCardBack,
                    last_updated: updatedUser.updated_at
                },
                upload_results: uploadResults,
                updated_fields: Object.keys(updateData)
            }));
        } else {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Không có tài liệu nào được upload'
            }));
        }

    } catch (error) {
        console.error('Error in updateUserLicense:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi cập nhật giấy phép',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};

// Delete specific license document
const deleteLicenseDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        const { document_type } = req.params; // 'business_license', 'identity_card_front', 'identity_card_back'

        // Validate document type
        const validDocumentTypes = ['business_license', 'identity_card_front', 'identity_card_back'];
        if (!validDocumentTypes.includes(document_type)) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Loại tài liệu không hợp lệ'
            }));
        }

        // Map document type to database field
        const fieldMapping = {
            'business_license': 'business_license_image',
            'identity_card_front': 'identity_card_image',
            'identity_card_back': 'identity_card_back_image'
        };

        const fieldName = fieldMapping[document_type];

        // Get current user data
        const user = await User.findByPk(userId, {
            attributes: ['id', fieldName]
        });

        if (!user) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Không tìm thấy thông tin người dùng'
            }));
        }

        // Check if document exists
        if (!user[fieldName]) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Tài liệu không tồn tại'
            }));
        }

        // Update user to remove document
        await User.update(
            { [fieldName]: null },
            { where: { id: userId } }
        );

        return res.json(responseFormatter.success({
            message: 'Xóa tài liệu thành công',
            deleted_document: document_type
        }));

    } catch (error) {
        console.error('Error in deleteLicenseDocument:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi xóa tài liệu',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};


// Get field detail for editing (owner only)
const getFieldForEdit = async (req, res) => {
    try {
        const fieldId = req.params.id;
        const ownerId = req.user.id;

        const field = await Field.findOne({
            where: { 
                id: fieldId,
                owner_id: ownerId
            },
            include: [
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type']
                }
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
                'updated_at'
            ]
        });

        if (!field) {
            return res.status(404).json(responseFormatter.error({
                code: 'NOT_FOUND',
                message: 'Không tìm thấy sân bóng hoặc bạn không có quyền chỉnh sửa'
            }));
        }

        return res.json(responseFormatter.success(field));
    } catch (error) {
        console.error('Error in getFieldForEdit:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy thông tin sân bóng',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }));
    }
};

// Search fields by location within radius (8km default)
const searchFieldsByLocation = async (req, res) => {
    try {
        const { 
            address, 
            latitude, 
            longitude, 
            radius = 8, 
            page = 1, 
            limit = 10 
        } = req.query;

        let searchLat, searchLon;

        // If address is provided, geocode it first
        if (address) {
            try {
                const geocodeResult = await geocodingService.geocodeAddress(address);
                searchLat = geocodeResult.latitude;
                searchLon = geocodeResult.longitude;
                
                logger.info(`Geocoded address "${address}" to coordinates: ${searchLat}, ${searchLon}`);
            } catch (geocodeError) {
                logger.error('Geocoding error:', geocodeError);
                return res.status(400).json(responseFormatter.error(
                    'Không thể xác định tọa độ từ địa chỉ đã cung cấp',
                    400
                ));
            }
        } else if (latitude && longitude) {
            // Use provided coordinates
            searchLat = parseFloat(latitude);
            searchLon = parseFloat(longitude);
            
            // Validate coordinates
            if (!geocodingService.validateCoordinates(searchLat, searchLon)) {
                return res.status(400).json(responseFormatter.error(
                    'Tọa độ không hợp lệ',
                    400
                ));
            }
        } else {
            return res.status(400).json(responseFormatter.error(
                'Vui lòng cung cấp địa chỉ hoặc tọa độ để tìm kiếm',
                400
            ));
        }

        const radiusKm = parseFloat(radius);
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const offset = (pageNumber - 1) * limitNumber;

        // Get bounds for optimized database query
        const bounds = geocodingService.getBounds(searchLat, searchLon, radiusKm);

        // First, get all fields within the bounding box (for performance)
        const fieldsInBounds = await Field.findAll({
            where: {
                is_verified: true
            },
            include: [
                {
                    model: Location,
                    as: 'location',
                    where: {
                        latitude: {
                            [Op.between]: [bounds.minLat, bounds.maxLat]
                        },
                        longitude: {
                            [Op.between]: [bounds.minLon, bounds.maxLon]
                        },
                        latitude: { [Op.not]: null },
                        longitude: { [Op.not]: null }
                    },
                    attributes: [
                        'id', 'latitude', 'longitude', 'address_text', 
                        'formatted_address', 'city', 'district', 'ward'
                    ]
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SubField,
                    as: 'subfields',
                    attributes: ['id', 'name', 'field_type']
                }
            ],
            attributes: [
                'id', 'name', 'description', 'price_per_hour', 
                'images1', 'images2', 'images3', 'is_verified', 
                'created_at'
            ]
        });

        // Calculate exact distances and filter by radius
        const fieldsWithDistance = geocodingService.findLocationsWithinRadius(
            searchLat, 
            searchLon, 
            fieldsInBounds.map(field => ({
                ...field.toJSON(),
                latitude: field.location.latitude,
                longitude: field.location.longitude
            })), 
            radiusKm
        );

        // Apply pagination
        const totalResults = fieldsWithDistance.length;
        const paginatedFields = fieldsWithDistance.slice(offset, offset + limitNumber);

        return res.json(responseFormatter.success({
            fields: paginatedFields,
            search_info: {                search_coordinates: {
                    latitude: searchLat,
                    longitude: searchLon
                },
                radius_km: radiusKm,
                total_found: totalResults
            },
            pagination: {
                total: totalResults,
                page: pageNumber,
                limit: limitNumber,
                total_pages: Math.ceil(totalResults / limitNumber)
            }
        }));
        
    } catch (error) {
        logger.error('Error in searchFieldsByLocation:', error);
        return res.status(500).json(responseFormatter.error(
            'Đã có lỗi xảy ra khi tìm kiếm sân bóng theo vị trí',
            500,
            process.env.NODE_ENV === 'development' ? error.message : undefined
        ));
    }
};

// Geocode an address and return coordinates
const geocodeAddress = async (req, res) => {
    try {
        console.log('=== geocodeAddress API DEBUG ===');
        console.log('Request method:', req.method);
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Request body:', req.body);
        console.log('Body type:', typeof req.body);
        console.log('Body keys:', Object.keys(req.body || {}));
        
        // Extract address with multiple fallbacks
        let address = null;
        
        if (req.body && typeof req.body === 'object') {
            address = req.body.address;
        } else if (typeof req.body === 'string') {
            // Handle case where body is sent as string
            try {
                const parsedBody = JSON.parse(req.body);
                address = parsedBody.address;
            } catch (parseError) {
                console.log('Failed to parse body as JSON:', parseError.message);
            }
        }
        
        console.log('Extracted address:', address);
        console.log('Address type:', typeof address);

        // Comprehensive input validation
        if (!address) {
            console.log('❌ Address validation failed - no address provided');
            return res.status(400).json(responseFormatter.error(
                'Vui lòng cung cấp địa chỉ trong trường "address"',
                400,
                {
                    received_body: req.body,
                    expected_format: { address: "string" },
                    field_missing: "address"
                }
            ));
        }

        if (typeof address !== 'string') {
            console.log('❌ Address validation failed - not a string');
            return res.status(400).json(responseFormatter.error(
                'Địa chỉ phải là chuỗi văn bản',
                400,
                {
                    received_type: typeof address,
                    expected_type: "string"
                }
            ));
        }

        const trimmedAddress = address.trim();
        if (trimmedAddress.length === 0) {
            console.log('❌ Address validation failed - empty string');
            return res.status(400).json(responseFormatter.error(
                'Địa chỉ không được để trống',
                400,
                { received_address: address }
            ));
        }

        if (trimmedAddress.length > 500) {
            console.log('❌ Address validation failed - too long');
            return res.status(400).json(responseFormatter.error(
                'Địa chỉ quá dài (tối đa 500 ký tự)',
                400,
                { 
                    address_length: trimmedAddress.length,
                    max_length: 500
                }
            ));
        }

        console.log('✅ Address validation passed');
        console.log(`📍 Calling geocoding service with: "${trimmedAddress}"`);
        
        const startTime = Date.now();
        const result = await geocodingService.geocodeAddress(trimmedAddress);
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log('✅ Geocoding successful');
        console.log(`⏱️ Processing time: ${processingTime}ms`);        console.log('📊 Result:', {
            coordinates: { latitude: result.latitude, longitude: result.longitude },
            address_info: {
                formatted_address: result.formattedAddress,
                city: result.city,
                district: result.district,
                ward: result.ward
            }
        });
        
        return res.json(responseFormatter.success({
            coordinates: {
                latitude: result.latitude,
                longitude: result.longitude
            },
            address_info: {
                formatted_address: result.formattedAddress,
                city: result.city,
                district: result.district,
                ward: result.ward,
                country: result.country
            },
            metadata: {
                source: result.provider || 'unknown',
                accuracy_level: result.detailLevel || 'unknown',
                fallback_used: result.fallbackUsed || false,
                processing_time_ms: processingTime
            }
        }));
        
    } catch (error) {
        console.error('❌ Error in geocodeAddress API:', error);
        logger.error('Error in geocodeAddress:', error);
        
        // Categorize errors and provide appropriate responses
        if (error.message.includes('INVALID_INPUT') || 
            error.message.includes('EMPTY_ADDRESS') || 
            error.message.includes('ADDRESS_TOO_LONG')) {
            
            return res.status(400).json(responseFormatter.error(
                'Dữ liệu đầu vào không hợp lệ',
                400,
                {
                    error_type: 'validation_error',
                    details: error.message,
                    received_address: req.body?.address
                }
            ));
        }
        
        if (error.message.includes('TIMEOUT')) {
            return res.status(408).json(responseFormatter.error(
                'Dịch vụ geocoding mất quá nhiều thời gian phản hồi',
                408,
                {
                    error_type: 'timeout_error',
                    details: error.message,
                    suggestion: 'Vui lòng thử lại sau ít phút'
                }
            ));
        }
        
        if (error.message.includes('GEOCODING_FAILED')) {
            return res.status(404).json(responseFormatter.error(
                'Không thể xác định tọa độ từ địa chỉ đã cung cấp',
                404,
                {
                    error_type: 'geocoding_failed',
                    details: error.message,
                    address: req.body?.address,
                    suggestion: 'Vui lòng kiểm tra lại địa chỉ hoặc thử với địa chỉ đơn giản hơn'
                }
            ));
        }
        
        // Unknown error
        return res.status(500).json(responseFormatter.error(
            'Đã có lỗi xảy ra trong quá trình xử lý geocoding',
            500,
            process.env.NODE_ENV === 'development' ? {
                error_type: 'unknown_error',
                details: error.message,
                stack: error.stack
            } : {
                error_type: 'internal_error',
                message: 'Vui lòng thử lại sau'
            }
        ));
    }
};

// Reverse geocode từ tọa độ sang địa chỉ
const reverseGeocodeAddress = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_COORDINATES',
                    message: 'Thiếu thông tin tọa độ (latitude, longitude)'
                }
            });
        }
        
        // Kiểm tra tọa độ hợp lệ
        if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_COORDINATES',
                    message: 'Tọa độ không hợp lệ'
                }
            });
        }
          // Gọi service reverse geocoding
        const result = await geocodingService.reverseGeocode(
            parseFloat(latitude), 
            parseFloat(longitude)
        );
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ADDRESS_NOT_FOUND',
                    message: 'Không thể tìm thấy địa chỉ từ tọa độ này'
                }
            });
        }
        
        return res.json({
            success: true,
            data: {
                address: result.address || result.formattedAddress,
                formatted_address: result.formattedAddress,
                street_address: result.streetNumber ? 
                    `${result.streetNumber} ${result.streetName}`.trim() : 
                    result.streetName || '',
                city: result.city,
                district: result.district,
                ward: result.ward,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                detail_level: result.detailLevel || 'unknown',
                provider: result.provider || 'unknown'
            }
        });
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'REVERSE_GEOCODING_ERROR',
                message: 'Đã có lỗi xảy ra khi chuyển đổi tọa độ thành địa chỉ',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Get nearest fields (simplified version)
const getNearestFields = async (req, res) => {
    try {
        const { latitude, longitude, limit = 5 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json(responseFormatter.error(
                'Vui lòng cung cấp tọa độ (latitude, longitude)',
                400
            ));
        }

        const searchLat = parseFloat(latitude);
        const searchLon = parseFloat(longitude);

        if (!geocodingService.validateCoordinates(searchLat, searchLon)) {
            return res.status(400).json(responseFormatter.error(
                'Tọa độ không hợp lệ',
                400
            ));
        }

        // Use 50km radius for "nearest" search
        const fields = await searchFieldsByLocationInternal(searchLat, searchLon, 50, parseInt(limit));

        return res.json(responseFormatter.success({
            nearest_fields: fields.slice(0, parseInt(limit)),
            search_coordinates: {
                latitude: searchLat,
                longitude: searchLon
            }
        }));
        
    } catch (error) {
        logger.error('Error in getNearestFields:', error);
        return res.status(500).json(responseFormatter.error(
            'Đã có lỗi xảy ra khi tìm kiếm sân bóng gần nhất',
            500
        ));
    }
};

// Internal helper function for location search
const searchFieldsByLocationInternal = async (latitude, longitude, radiusKm, limitNumber = null) => {
    const bounds = geocodingService.getBounds(latitude, longitude, radiusKm);

    const queryOptions = {
        where: {
            is_verified: true
        },
        include: [
            {
                model: Location,
                as: 'location',
                where: {
                    latitude: {
                        [Op.between]: [bounds.minLat, bounds.maxLat]
                    },
                    longitude: {
                        [Op.between]: [bounds.minLon, bounds.maxLon]
                    },
                    latitude: { [Op.not]: null },
                    longitude: { [Op.not]: null }
                },
                attributes: [
                    'id', 'latitude', 'longitude', 'address_text', 
                    'formatted_address', 'city', 'district', 'ward'
                ]
            },
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'phone']
            },
            {
                model: SubField,
                as: 'subfields',
                attributes: ['id', 'name', 'field_type']
            }
        ],
        attributes: [
            'id', 'name', 'description', 'price_per_hour', 
            'images1', 'images2', 'images3', 'is_verified', 
            'created_at'
        ]
    };

    if (limitNumber) {
        queryOptions.limit = limitNumber * 3; // Get more than needed for distance filtering
    }

    const fieldsInBounds = await Field.findAll(queryOptions);

    // Calculate exact distances and filter by radius
    const fieldsWithDistance = geocodingService.findLocationsWithinRadius(
        latitude, 
        longitude, 
        fieldsInBounds.map(field => ({
            ...field.toJSON(),
            latitude: field.location.latitude,
            longitude: field.location.longitude
        })), 
        radiusKm
    );

    return fieldsWithDistance;
};

// Manual package validation endpoint (Admin only)
const validatePackagesManual = async (req, res) => {
    try {
        const { runPackageValidationNow } = require('../utils/cronJobs');
        
        console.log('[MANUAL_VALIDATION] Admin đang chạy kiểm tra gói dịch vụ thủ công...');
        await runPackageValidationNow();
        
        return res.json({
            success: true,
            message: 'Đã hoàn thành kiểm tra và cập nhật trạng thái gói dịch vụ',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in validatePackagesManual:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Có lỗi xảy ra khi kiểm tra gói dịch vụ',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

// Get fields with package status check
const getFieldsWithPackageCheck = async (req, res) => {
    try {
        const fields = await Field.findAll({
            where: {
                is_verified: true
            },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'package_type', 'package_expire_date'],
                    where: {
                        [Op.and]: [
                            { package_type: { [Op.ne]: 'none' } },
                            {
                                [Op.or]: [
                                    { package_expire_date: { [Op.gte]: new Date() } },
                                    { package_expire_date: { [Op.is]: null } }
                                ]
                            }
                        ]
                    }
                },
                {
                    model: Location,
                    as: 'location',
                    attributes: ['address_text', 'city', 'district', 'ward']
                }
            ],
            attributes: ['id', 'name', 'description', 'price_per_hour', 'images1', 'images2', 'images3'],
            order: [['created_at', 'DESC']]
        });

        // Thêm thông tin về trạng thái gói cho mỗi field
        const fieldsWithPackageInfo = fields.map(field => {
            const fieldData = field.toJSON();
            const owner = fieldData.owner;
            
            fieldData.packageStatus = {
                hasValidPackage: owner.package_type !== 'none',
                packageType: owner.package_type,
                expireDate: owner.package_expire_date,
                isExpired: owner.package_expire_date ? new Date(owner.package_expire_date) < new Date() : false
            };
            
            return fieldData;
        });

        return res.json({
            success: true,
            data: fieldsWithPackageInfo,
            meta: {
                total: fieldsWithPackageInfo.length,
                checkedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in getFieldsWithPackageCheck:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy danh sách sân',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

module.exports = {
    getAllFields,
    getFields,
    addField,
    getFieldDetail,
    searchFields,
    // Location-based search functions
    searchFieldsByLocation,
    geocodeAddress,
    reverseGeocodeAddress,
    getNearestFields,
    // ...existing functions...
    getOwnerFields,
    addFieldWithFiles,
    updateFieldWithFiles,
    getFieldForEdit,
    // License management functions
    getUserLicense,
    updateUserLicense,
    deleteLicenseDocument,
    // Package validation functions
    validatePackagesManual,
    getFieldsWithPackageCheck
};
