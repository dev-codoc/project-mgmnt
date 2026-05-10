const Project = require('../models/Project');
const Task = require('../models/Task');

// Helper: build filter query
const buildProjectFilter = (query, userId, isAdmin) => {
  const filter = isAdmin ? {} : { $or: [{ owner: userId }, { members: userId }] };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) filter.$text = { $search: query.search };

  return filter;
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || '-createdAt';

    const filter = buildProjectFilter(req.query, req.user._id, req.user.role === 'admin');

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('owner', 'name email')
        .populate('members', 'name email')
        .populate('taskCount')
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + projects.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isAuthorized =
      req.user.role === 'admin' ||
      project.owner._id.equals(req.user._id) ||
      project.members.some((m) => m._id.equals(req.user._id));

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tasks = await Task.find({ project: project._id })
      .populate('assignee', 'name email')
      .sort('-createdAt');

    res.json({ success: true, data: { ...project.toJSON(), tasks } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const project = await Project.create({
      ...req.body,
      owner: req.user._id,
      members: req.body.members || [],
    });

    await project.populate('owner', 'name email');
    res.status(201).json({ success: true, message: 'Project created.', data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const canEdit = req.user.role === 'admin' || project.owner.equals(req.user._id);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Only owner or admin can edit.' });
    }

    const { owner: _, ...updateData } = req.body; // prevent owner change
    const updated = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email')
      .populate('members', 'name email');

    res.json({ success: true, message: 'Project updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const canDelete = req.user.role === 'admin' || project.owner.equals(req.user._id);
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Only owner or admin can delete.' });
    }

    // Delete all tasks in project
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project and all its tasks deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/projects/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? {} : { $or: [{ owner: req.user._id }, { members: req.user._id }] };
    const projectIds = (await Project.find(userFilter).select('_id')).map((p) => p._id);

    const [
      totalProjects,
      projectsByStatus,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
    ] = await Promise.all([
      Project.countDocuments(userFilter),
      Project.aggregate([
        { $match: userFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        project: { $in: projectIds },
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        overdueTasks,
        projectsByStatus: Object.fromEntries(projectsByStatus.map((s) => [s._id, s.count])),
        tasksByStatus: Object.fromEntries(tasksByStatus.map((s) => [s._id, s.count])),
        tasksByPriority: Object.fromEntries(tasksByPriority.map((s) => [s._id, s.count])),
      },
    });
  } catch (error) {
    next(error);
  }
};
