import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../api';
import useAuthStore from '../store/authStore';

const StatCard = ({ label, value, sub, color }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const ProgressBar = ({ label, value, total, color }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div className="chart-bar">
        <div className="chart-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          projectsAPI.getStats(),
          tasksAPI.getAll({ limit: 5, myTasks: user.role !== 'admin' ? 'true' : undefined, sortBy: '-createdAt' }),
        ]);
        setStats(statsRes.data);
        setRecentTasks(tasksRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const taskTotal = stats ? Object.values(stats.tasksByStatus).reduce((a, b) => a + b, 0) : 0;
  const projectTotal = stats?.totalProjects || 0;

  const statusColors = {
    todo: 'var(--status-todo)',
    'in-progress': 'var(--status-inprogress)',
    review: 'var(--status-review)',
    done: 'var(--status-done)',
  };

  const projStatusColors = {
    active: 'var(--success)',
    'on-hold': 'var(--warning)',
    completed: 'var(--accent)',
    archived: 'var(--text-muted)',
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <Link to="/projects" className="btn btn-primary btn-sm">+ New Project</Link>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div className="card-grid card-grid-4">
              <StatCard label="Total Projects" value={stats?.totalProjects} color="var(--accent)" sub={`${stats?.projectsByStatus?.active || 0} active`} />
              <StatCard label="Total Tasks" value={stats?.totalTasks} color="var(--purple)" sub={`${stats?.tasksByStatus?.done || 0} completed`} />
              <StatCard label="In Progress" value={stats?.tasksByStatus?.['in-progress'] || 0} color="var(--warning)" sub="tasks being worked on" />
              <StatCard label="Overdue" value={stats?.overdueTasks} color="var(--danger)" sub="past due date" />
            </div>

            <div className="dashboard-grid">
              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 20 }}>Tasks by Status</h3>
                {Object.entries(stats?.tasksByStatus || {}).map(([status, count]) => (
                  <ProgressBar key={status} label={status} value={count} total={taskTotal} color={statusColors[status] || 'var(--accent)'} />
                ))}
                {taskTotal === 0 && <p className="text-muted text-sm">No tasks yet</p>}
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 20 }}>Projects by Status</h3>
                {Object.entries(stats?.projectsByStatus || {}).map(([status, count]) => (
                  <ProgressBar key={status} label={status} value={count} total={projectTotal} color={projStatusColors[status] || 'var(--accent)'} />
                ))}
                {projectTotal === 0 && <p className="text-muted text-sm">No projects yet</p>}
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Recent Tasks</h3>
                <Link to="/tasks" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
              </div>
              {recentTasks.length === 0 ? (
                <p className="text-muted text-sm">No tasks found</p>
              ) : (
                recentTasks.map((task) => (
                  <div key={task._id} className="task-row">
                    <div className={`task-check ${task.status === 'done' ? 'done' : ''}`}>
                      {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div className="task-title" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'inherit' }}>
                      {task.title}
                    </div>
                    <span className="text-sm text-muted">{task.project?.name}</span>
                    <span className={`badge badge-${task.status === 'in-progress' ? 'inprogress' : task.status}`}>{task.status}</span>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
