const assetService = require('../services/asset.service');

/**
 * Controller handling hardware asset inventory and assignment lifecycle endpoints.
 */
class AssetController {
  async getAllAssets(req, res, next) {
    try {
      const { search, category, status, assigned, page, limit } = req.query;
      const result = await assetService.getAllAssets({
        search,
        category,
        status,
        assigned,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getAssetById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const asset = await assetService.getAssetById(id);
      return res.status(200).json({
        success: true,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }

  async createAsset(req, res, next) {
    try {
      const adminId = req.admin ? req.admin.id : null;
      const asset = await assetService.createAsset(req.body, adminId);

      return res.status(201).json({
        success: true,
        message: 'Asset registered successfully.',
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAsset(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const adminId = req.admin ? req.admin.id : null;
      const asset = await assetService.updateAsset(id, req.body, adminId);

      return res.status(200).json({
        success: true,
        message: 'Asset updated successfully.',
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }

  async assignAsset(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const { employee_id, notes } = req.body;
      const adminId = req.admin ? req.admin.id : null;
      const asset = await assetService.assignAsset(id, employee_id, adminId, notes);

      return res.status(200).json({
        success: true,
        message: `Asset '${asset.asset_tag}' successfully assigned to employee.`,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }

  async returnAsset(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const { notes } = req.body;
      const adminId = req.admin ? req.admin.id : null;
      const asset = await assetService.returnAsset(id, adminId, notes);

      return res.status(200).json({
        success: true,
        message: `Asset '${asset.asset_tag}' successfully returned to inventory.`,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }

  async getAssetHistory(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const history = await assetService.getAssetHistory(id);
      return res.status(200).json({
        success: true,
        data: { history }
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAsset(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid asset ID parameter.' });
      }

      const adminId = req.admin ? req.admin.id : null;
      const result = await assetService.deleteAsset(id, adminId);

      return res.status(200).json({
        success: true,
        message: 'Asset deleted successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AssetController();
