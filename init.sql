-- Создание таблицы ролей
CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role_id INTEGER REFERENCES roles(role_id),
  full_name VARCHAR(100) NOT NULL
);

-- Создание таблицы предметов
CREATE TABLE IF NOT EXISTS subjects (
  subjects_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Добавление начальных предметов
INSERT INTO subjects (name) VALUES 
  ('Математика'),
  ('Физика'),
  ('Информатика'),
  ('История'),
  ('Литература')
ON CONFLICT (name) DO NOTHING;

-- Создание таблицы групп
CREATE TABLE IF NOT EXISTS groups (
  group_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Связь студент-группа (многие ко многим)
CREATE TABLE IF NOT EXISTS student_groups (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

-- Связь преподаватель-группа (многие ко многим)
CREATE TABLE IF NOT EXISTS teacher_groups (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

-- Добавление роли "admin"
INSERT INTO roles (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='admin');

-- Создание пользователя-админа
INSERT INTO users (username, password, role_id, full_name)
VALUES (
  'admin',
  'admin123', -- в продакшене нужно захешировать!
  (SELECT role_id FROM roles WHERE name='admin'),
  'Администратор'
)
ON CONFLICT (username) DO NOTHING; 