const Task = require('../models/Task');
const Project = require('../models/Project');

// Helper: verify user can access project
const verifyProjectAccess = async (projectId, userId, role) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };

  const hasAccess =
    role === 'admin' ||
    project.owner.equals(userId) ||
    project.members.some((m) => m.equals(userId));

  if (!hasAccess) return { error: 'Access denied to this project', status: 403 };
  return { project };
};

// @desc    Get all tasks (with filters, search, pagination)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || '-createdAt';

    // Build filter
    const filter = {};
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;
    if (req.query.search) filter.$text = { $search: req.query.search };
    if (req.query.myTasks === 'true') filter.assignee = req.user._id;

    // Non-admins can only see tasks in their projects
    if (req.user.role !== 'admin') {
      const myProjects = await Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select('_id');
      const projectIds = myProjects.map((p) => p._id);
      filter.project = filter.project
        ? { $in: projectIds.filter((id) => id.equals(filter.project)) }
        : { $in: projectIds };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .populate('project', 'name status')
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + tasks.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email role')
      .populate('createdBy', 'name email')
      .populate('project', 'name status owner members');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const project = task.project;
    const hasAccess =
      req.user.role === 'admin' ||
      project.owner.equals(req.user._id) ||
      project.members.some((m) => m.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const { project: projectId } = req.body;
    const access = await verifyProjectAccess(projectId, req.user._id, req.user.role);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    await task.populate([
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);

    res.status(201).json({ success: true, message: 'Task created.', data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'owner members');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const project = task.project;
    const canEdit =
      req.user.role === 'admin' ||
      project.owner.equals(req.user._id) ||
      project.members.some((m) => m.equals(req.user._id)) ||
      (task.assignee && task.assignee.equals(req.user._id));

    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this task.' });
    }

    // Prevent changing project
    const { project: _, createdBy: __, ...updateData } = req.body;

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);

    res.json({ success: true, message: 'Task updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'owner');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const canDelete =
      req.user.role === 'admin' ||
      task.project.owner.equals(req.user._id) ||
      task.createdBy.equals(req.user._id);

    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete.' });
    }

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};
