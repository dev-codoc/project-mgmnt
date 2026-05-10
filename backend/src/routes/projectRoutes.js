const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getDashboardStats,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { projectRules, paginationRules, validate } = require('../middleware/validators');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/', paginationRules, validate, getProjects);
router.post('/', projectRules, validate, createProject);
router.get('/:id', getProject);
router.put('/:id', projectRules, validate, updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
