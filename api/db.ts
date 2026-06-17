import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'timesheet.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(200) NOT NULL,
      manager_id INTEGER NOT NULL,
      estimated_hours INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      estimated_hours INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      date DATE NOT NULL,
      hours DECIMAL(4,1) NOT NULL CHECK (hours > 0 AND hours <= 24),
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  `);

  const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
  const hasStatus = columns.some((c) => c.name === 'status');
  if (!hasStatus) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));
    `);
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedData();
  }
}

function seedData() {
  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
  );

  const adminId = insertUser.run('admin', hash('123456'), '系统管理员', 'admin').lastInsertRowid;
  const manager1Id = insertUser.run('manager1', hash('123456'), '张经理', 'manager').lastInsertRowid;
  const manager2Id = insertUser.run('manager2', hash('123456'), '刘经理', 'manager').lastInsertRowid;
  const employee1Id = insertUser.run('employee1', hash('123456'), '李员工', 'employee').lastInsertRowid;
  const employee2Id = insertUser.run('employee2', hash('123456'), '王员工', 'employee').lastInsertRowid;
  const employee3Id = insertUser.run('employee3', hash('123456'), '赵员工', 'employee').lastInsertRowid;

  const insertProject = db.prepare(
    'INSERT INTO projects (name, manager_id, estimated_hours, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  const project1Id = insertProject.run(
    '电商平台重构',
    Number(manager1Id),
    320,
    formatDate(addDays(today, -30)),
    formatDate(addDays(today, 60)),
    'active'
  ).lastInsertRowid;

  const project2Id = insertProject.run(
    '移动APP开发',
    Number(manager2Id),
    200,
    formatDate(addDays(today, -20)),
    formatDate(addDays(today, 40)),
    'active'
  ).lastInsertRowid;

  const project3Id = insertProject.run(
    '数据分析系统',
    Number(manager1Id),
    150,
    formatDate(addDays(today, -60)),
    formatDate(addDays(today, -5)),
    'completed'
  ).lastInsertRowid;

  const insertTask = db.prepare(
    'INSERT INTO tasks (project_id, name, estimated_hours, status) VALUES (?, ?, ?, ?)'
  );

  const t1 = insertTask.run(Number(project1Id), '需求分析', 40, 'completed').lastInsertRowid;
  const t2 = insertTask.run(Number(project1Id), 'UI设计', 60, 'completed').lastInsertRowid;
  const t3 = insertTask.run(Number(project1Id), '前端开发', 120, 'pending').lastInsertRowid;
  const t4 = insertTask.run(Number(project1Id), '后端开发', 80, 'pending').lastInsertRowid;
  const t5 = insertTask.run(Number(project1Id), '测试上线', 20, 'pending').lastInsertRowid;

  const t6 = insertTask.run(Number(project2Id), '产品原型', 30, 'completed').lastInsertRowid;
  const t7 = insertTask.run(Number(project2Id), 'iOS开发', 80, 'pending').lastInsertRowid;
  const t8 = insertTask.run(Number(project2Id), 'Android开发', 70, 'pending').lastInsertRowid;
  const t9 = insertTask.run(Number(project2Id), '联调测试', 20, 'pending').lastInsertRowid;

  const t10 = insertTask.run(Number(project3Id), '数据采集', 40, 'completed').lastInsertRowid;
  const t11 = insertTask.run(Number(project3Id), '报表开发', 70, 'completed').lastInsertRowid;
  const t12 = insertTask.run(Number(project3Id), '系统部署', 40, 'completed').lastInsertRowid;

  const insertTimeEntry = db.prepare(
    'INSERT INTO time_entries (user_id, project_id, task_id, date, hours, description, status, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const pastDate = (daysAgo: number) => formatDate(addDays(today, -daysAgo));

  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t1), pastDate(28), 6, '完成需求调研文档', 'approved', pastDate(27));
  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t1), pastDate(27), 7, '整理用户访谈记录', 'approved', pastDate(26));
  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t3), pastDate(5), 8, '首页组件开发', 'approved', pastDate(4));
  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t3), pastDate(4), 7, '商品列表页开发', 'approved', pastDate(3));
  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t3), pastDate(3), 6, '购物车功能开发', 'pending', null);
  insertTimeEntry.run(Number(employee1Id), Number(project1Id), Number(t3), pastDate(2), 8, '订单页面开发', 'pending', null);
  insertTimeEntry.run(Number(employee1Id), Number(project2Id), Number(t6), pastDate(15), 5, '绘制产品原型图', 'approved', pastDate(14));
  insertTimeEntry.run(Number(employee1Id), Number(project3Id), Number(t10), pastDate(55), 8, '设计数据采集方案', 'approved', pastDate(54));

  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t2), pastDate(25), 7, '设计首页UI', 'approved', pastDate(24));
  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t2), pastDate(24), 8, '设计商品详情页UI', 'approved', pastDate(23));
  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t2), pastDate(23), 6, '设计个人中心UI', 'approved', pastDate(22));
  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t4), pastDate(6), 8, '用户模块API开发', 'approved', pastDate(5));
  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t4), pastDate(5), 7, '订单模块API开发', 'pending', null);
  insertTimeEntry.run(Number(employee2Id), Number(project1Id), Number(t4), pastDate(4), 6, '支付接口集成', 'pending', null);
  insertTimeEntry.run(Number(employee2Id), Number(project2Id), Number(t7), pastDate(10), 8, '登录模块开发', 'approved', pastDate(9));
  insertTimeEntry.run(Number(employee2Id), Number(project3Id), Number(t11), pastDate(45), 8, '销售报表开发', 'approved', pastDate(44));

  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t8), pastDate(8), 7, '首页模块开发', 'approved', pastDate(7));
  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t8), pastDate(7), 8, '商品模块开发', 'approved', pastDate(6));
  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t8), pastDate(6), 6, '购物车模块开发', 'pending', null);
  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t8), pastDate(5), 7, '订单模块开发', 'pending', null);
  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t8), pastDate(3), 8, '个人中心开发', 'pending', null);
  insertTimeEntry.run(Number(employee3Id), Number(project2Id), Number(t9), pastDate(2), 4, '功能联调测试', 'pending', null);
  insertTimeEntry.run(Number(employee3Id), Number(project1Id), Number(t5), pastDate(1), 3, '编写测试用例', 'pending', null);
  insertTimeEntry.run(Number(employee3Id), Number(project3Id), Number(t12), pastDate(10), 8, '服务器环境配置', 'approved', pastDate(9));
  insertTimeEntry.run(Number(employee3Id), Number(project3Id), Number(t12), pastDate(8), 6, '系统部署上线', 'approved', pastDate(7));
}

export default db;
