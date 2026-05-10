require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  // Clear existing data
  await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany()]);

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'password123',
    role: 'admin',
  });

  const user1 = await User.create({
    name: 'Alice Dev',
    email: 'alice@demo.com',
    password: 'password123',
  });

  const user2 = await User.create({
    name: 'Bob Coder',
    email: 'bob@demo.com',
    password: 'password123',
  });

  // Create projects
  const project1 = await Project.create({
    name: 'E-Commerce Platform',
    description: 'Building a full-stack e-commerce solution with React and Node.js',
    status: 'active',
    priority: 'high',
    owner: admin._id,
    members: [user1._id, user2._id],
    tags: ['react', 'nodejs', 'mongodb'],
  });

  const project2 = await Project.create({
    name: 'Mobile App Redesign',
    description: 'Redesigning the mobile app for better UX and performance',
    status: 'active',
    priority: 'medium',
    owner: user1._id,
    members: [user2._id],
    tags: ['mobile', 'ui/ux'],
  });

  const project3 = await Project.create({
    name: 'API Documentation',
    description: 'Writing comprehensive API docs with Swagger',
    status: 'on-hold',
    priority: 'low',
    owner: user2._id,
    members: [],
  });

  // Create tasks
  const tasks = [
    { title: 'Set up project structure', status: 'done', priority: 'high', project: project1._id, assignee: user1._id, createdBy: admin._id },
    { title: 'Design database schema', status: 'done', priority: 'high', project: project1._id, assignee: admin._id, createdBy: admin._id },
    { title: 'Implement user authentication', status: 'in-progress', priority: 'high', project: project1._id, assignee: user1._id, createdBy: admin._id },
    { title: 'Build product listing page', status: 'todo', priority: 'medium', project: project1._id, assignee: user2._id, createdBy: admin._id },
    { title: 'Payment gateway integration', status: 'todo', priority: 'critical', project: project1._id, assignee: user1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 7 * 86400000) },
    { title: 'Wireframe new home screen', status: 'done', priority: 'high', project: project2._id, assignee: user1._id, createdBy: user1._id },
    { title: 'Implement navigation redesign', status: 'in-progress', priority: 'medium', project: project2._id, assignee: user2._id, createdBy: user1._id },
    { title: 'Performance optimization', status: 'todo', priority: 'medium', project: project2._id, assignee: user1._id, createdBy: user1._id },
    { title: 'Write auth endpoint docs', status: 'todo', priority: 'low', project: project3._id, assignee: user2._id, createdBy: user2._id },
    { title: 'Set up Swagger UI', status: 'in-progress', priority: 'medium', project: project3._id, assignee: user2._id, createdBy: user2._id },
  ];

  await Task.insertMany(tasks);

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:  admin@demo.com  / password123');
  console.log('👤 Alice:  alice@demo.com  / password123');
  console.log('👤 Bob:    bob@demo.com    / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((e) => { console.error(e); process.exit(1); });
