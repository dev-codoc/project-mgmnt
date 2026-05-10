const express = require('express');
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { taskRules, paginationRules, validate } = require('../middleware/validators');

router.use(protect);

router.get('/', paginationRules, validate, getTasks);
router.post('/', taskRules, validate, createTask);
router.get('/:id', getTask);
router.put('/:id', validate, updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
