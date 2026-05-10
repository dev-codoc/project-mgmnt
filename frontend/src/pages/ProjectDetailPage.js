import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, authAPI } from '../api';
import useAuthStore from '../store/authStore';

const STATUS_COLS = ['todo', 'in-progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', status: 'todo', priority: 'medium', assignee: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await projectsAPI.getOne(id);
      setProject(res.data);
      setTasks(res.data.tasks || []);
    } catch (e) {
      if (e.message?.includes('not found')) navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (user?.role === 'admin') authAPI.getUsers().then(r => setUsers(r.users)).catch(() => {});
  }, [user]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await tasksAPI.create({ ...newTask, project: id, assignee: newTask.assignee || undefined });
      setNewTask({ title: '', status: 'todo', priority: 'medium', assignee: '' });
      setAddingTask(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (taskId, status) => {
    try { await tasksAPI.update(taskId, { status }); load(); } catch (e) { alert(e.message); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete task?')) return;
    try { await tasksAPI.delete(taskId); load(); } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!project) return null;

  const tasksByStatus = STATUS_COLS.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const statusColors = { todo: '#7c8499', 'in-progress': '#4f8ef7', review: '#f59e0b', done: '#22c55e' };

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Link to="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← Projects</Link>
          </div>
          <h2>{project.name}</h2>
          {project.description && <p>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge badge-${project.status === 'on-hold' ? 'onhold' : project.status}`}>{project.status}</span>
          <span className={`badge badge-${project.priority}`}>{project.priority}</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAddingTask(true)}>+ Add Task</button>
        </div>
      </div>

      <div className="page-body">
        {/* Project Meta */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 200 }}>
            <div className="stat-label">Owner</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{project.owner?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{project.owner?.email}</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 200 }}>
            <div className="stat-label">Members</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {project.members?.length ? project.members.map(m => (
                <span key={m._id} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 99 }}>{m.name}</span>
              )) : <span className="text-muted text-sm">No members</span>}
            </div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 200 }}>
            <div className="stat-label">Progress</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: 4 }}>
              {tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
            </div>
            <div className="chart-bar" style={{ marginTop: 8 }}>
              <div className="chart-bar-fill" style={{ width: `${tasks.length ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0}%`, background: 'var(--success)' }} />
            </div>
          </div>
        </div>

        {/* Add Task Form */}
        {addingTask && (
          <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)' }}>
            <h4 style={{ marginBottom: 14, fontSize: '0.875rem' }}>New Task</h4>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required placeholder="Task title..." />
              </div>
              <div className="form-group" style={{ minWidth: 130 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}>
                  {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ minWidth: 120 }}>
                <label className="form-label">Priority</label>
                <select className="form-select" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              {users.length > 0 && (
                <div className="form-group" style={{ minWidth: 140 }}>
                  <label className="form-label">Assignee</label>
                  <select className="form-select" value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddingTask(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minWidth: 0 }}>
          {STATUS_COLS.map(status => (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[status], flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                  {STATUS_LABELS[status]}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: 'var(--bg-hover)', padding: '1px 7px', borderRadius: 99, color: 'var(--text-muted)' }}>
                  {tasksByStatus[status].length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
                {tasksByStatus[status].map(task => (
                  <div key={task._id} className="card" style={{ padding: 12, cursor: 'default' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge badge-${task.priority}`} style={{ fontSize: '0.65rem' }}>{task.priority}</span>
                      {task.assignee && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ {task.assignee.name}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                        style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '3px 6px', fontFamily: 'inherit' }}>
                        {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <button className="btn btn-sm btn-danger btn-icon" style={{ padding: '3px 6px', fontSize: '0.7rem' }} onClick={() => handleDeleteTask(task._id)}>×</button>
                    </div>
                  </div>
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
