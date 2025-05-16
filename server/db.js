import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Создаем пул подключений к базе данных
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  client_encoding: 'UTF8'
});

// Проверка подключения
pool.on('error', (err) => {
  console.error('Ошибка подключения к базе данных:', err);
});

// Функция для проверки подключения
const checkConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Успешное подключение к базе данных');
    return true;
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Функция для создания таблиц
export const initializeDb = async () => {
  let client;
  try {
    // Проверяем подключение
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('Не удалось подключиться к базе данных');
    }

    client = await pool.connect();

    // Проверяем существование таблицы subjects
    const subjectsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subjects'
      );
    `);

    if (!subjectsExists.rows[0].exists) {
      // Создаем таблицу для предметов
      await client.query(`
        CREATE TABLE subjects (
          subjects_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE
        );
      `);

      // Вставляем начальные предметы
      await client.query(`
        INSERT INTO subjects (name) VALUES 
          ('Математика'),
          ('Физика'),
          ('Информатика'),
          ('История'),
          ('Литература');
      `);
    }

    // Проверяем существование таблицы days
    const daysExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'days'
      );
    `);

    if (!daysExists.rows[0].exists) {
      // Создаем таблицу для дней недели
      await client.query(`
        CREATE TABLE days (
          day_id SERIAL PRIMARY KEY,
          name VARCHAR(20) NOT NULL UNIQUE
        );
      `);

      // Вставляем дни недели
      await client.query(`
        INSERT INTO days (name) VALUES 
          ('Понедельник'),
          ('Вторник'),
          ('Среда'),
          ('Четверг'),
          ('Пятница'),
          ('Суббота');
      `);
    }

    // Проверяем существование таблицы lesson_times
    const lessonTimesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lesson_times'
      );
    `);

    if (!lessonTimesExists.rows[0].exists) {
      // Создаем таблицу для временных интервалов пар
      await client.query(`
        CREATE TABLE lesson_times (
          lesson_times_id SERIAL PRIMARY KEY,
          lesson_number INTEGER NOT NULL UNIQUE,
          first_half_start TIME NOT NULL,
          first_half_end TIME NOT NULL,
          second_half_start TIME NOT NULL,
          second_half_end TIME NOT NULL,
          break_duration INTEGER NOT NULL
        );
      `);

      // Вставляем временные интервалы для пар
      await client.query(`
        INSERT INTO lesson_times (lesson_number, first_half_start, first_half_end, second_half_start, second_half_end, break_duration) VALUES
          (1, '09:00', '09:45', '09:55', '10:40', 10),
          (2, '10:50', '11:35', '11:45', '12:30', 10),
          (3, '13:15', '14:00', '14:10', '14:55', 10),
          (4, '15:05', '15:50', '16:00', '16:45', 10),
          (5, '16:55', '17:40', '17:50', '18:35', 10),
          (6, '18:45', '19:30', '19:40', '20:25', 10);
      `);
    }

    // Проверяем существование таблицы lessons
    const lessonsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lessons'
      );
    `);

    if (!lessonsExists.rows[0].exists) {
      // Создаем таблицу для пар
      await client.query(`
        CREATE TABLE lessons (
          lesson_id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          lesson_number INTEGER NOT NULL,
          first_half_subject VARCHAR(100),
          second_half_subject VARCHAR(100),
          room VARCHAR(20),
          is_cancelled BOOLEAN DEFAULT false,
          FOREIGN KEY (lesson_number) REFERENCES lesson_times(lesson_number),
          UNIQUE(date, lesson_number)
        );
      `);

      // После создания таблицы lessons добавляем недостающие поля для отмены половин
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='lessons' AND column_name='is_cancelled_first_half'
          ) THEN
            ALTER TABLE lessons ADD COLUMN is_cancelled_first_half BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='lessons' AND column_name='is_cancelled_second_half'
          ) THEN
            ALTER TABLE lessons ADD COLUMN is_cancelled_second_half BOOLEAN DEFAULT false;
          END IF;
        END
        $$;
      `);

      // После создания таблицы lessons добавляем недостающие поля для аудиторий половин
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='lessons' AND column_name='room_first_half'
          ) THEN
            ALTER TABLE lessons ADD COLUMN room_first_half VARCHAR(20);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='lessons' AND column_name='room_second_half'
          ) THEN
            ALTER TABLE lessons ADD COLUMN room_second_half VARCHAR(20);
          END IF;
        END
        $$;
      `);
    }

    // Проверяем существование таблицы roles
    const rolesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `);

    if (!rolesExists.rows[0].exists) {
      // Создаем таблицу для ролей
      await client.query(`
        CREATE TABLE roles (
          role_id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE
        );
      `);

      // Вставляем базовые роли
      await client.query(`
        INSERT INTO roles (name) VALUES 
          ('student'),
          ('teacher');
      `);
    }

    // Проверяем существование таблицы users
    const usersExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!usersExists.rows[0].exists) {
      // Создаем таблицу для пользователей
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(100) NOT NULL,
          role_id INTEGER NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          FOREIGN KEY (role_id) REFERENCES roles(role_id)
        );
      `);

      // Создаем тестового пользователя (преподавателя)
      await client.query(`
        INSERT INTO users (username, password, role_id, full_name)
        VALUES ('teacher', 'teacher123', 2, 'Иванов Иван Иванович');
      `);

      // Создаем тестового пользователя (студента)
      await client.query(`
        INSERT INTO users (username, password, role_id, full_name)
        VALUES ('student', 'student123', 1, 'Петров Петр Петрович');
      `);
    }

    console.log('База данных инициализирована');
  } catch (err) {
    console.error('Ошибка при инициализации базы данных:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Функция для получения временных интервалов пар
export const getLessonTimes = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM lesson_times ORDER BY lesson_number');
    return result.rows;
  } finally {
    client.release();
  }
};

// Функция для добавления занятия
export const addLesson = async (date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO lessons 
       (date, lesson_number, first_half_subject, second_half_subject, room_first_half, room_second_half)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (date, lesson_number) 
       DO UPDATE SET 
         first_half_subject = EXCLUDED.first_half_subject,
         second_half_subject = EXCLUDED.second_half_subject,
         room_first_half = EXCLUDED.room_first_half,
         room_second_half = EXCLUDED.room_second_half
       RETURNING *`,
      [date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

// Функция для удаления занятия
export const deleteLesson = async (date, lessonNumber) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM lessons 
       WHERE date = $1 AND lesson_number = $2
       RETURNING *`,
      [date, lessonNumber]
    );
    return { 
      success: true, 
      message: 'Занятие успешно удалено',
      deletedLesson: result.rows[0]
    };
  } catch (err) {
    console.error('Ошибка при удалении занятия:', err);
    return { 
      success: false, 
      error: err.message 
    };
  } finally {
    client.release();
  }
};

// Функция для получения расписания на дату
export const getScheduleForDate = async (date) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT l.*, lt.first_half_start, lt.first_half_end, 
             lt.second_half_start, lt.second_half_end, lt.break_duration
      FROM lessons l
      LEFT JOIN lesson_times lt ON l.lesson_number = lt.lesson_number
      WHERE l.date = $1
      ORDER BY l.lesson_number
    `, [date]);
    return result.rows;
  } finally {
    client.release();
  }
};

// Функция для получения всех предметов
export const getSubjects = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM subjects ORDER BY name');
    return result.rows;
  } finally {
    client.release();
  }
};

// Функция для добавления предмета
export const addSubject = async (name) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO subjects (name) VALUES ($1) RETURNING *',
      [name]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Функция для удаления предмета
export const deleteSubject = async (id) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM subjects WHERE subjects_id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Функция для получения расписания
export const getSchedule = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT l.*, lt.first_half_start, lt.first_half_end, 
             lt.second_half_start, lt.second_half_end, lt.break_duration
      FROM lessons l
      LEFT JOIN lesson_times lt ON l.lesson_number = lt.lesson_number
      ORDER BY l.date, l.lesson_number
    `);
    
    console.log('Получено занятий из базы:', result.rows.length);
    console.log('Пример занятия:', result.rows[0]);
    
    return result.rows;
  } catch (err) {
    console.error('Ошибка при получении расписания:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Функция для обновления статуса занятия
export const updateLessonStatus = async (date, lessonNumber, isCancelled) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE lessons 
       SET is_cancelled = $1 
       WHERE date = $2 AND lesson_number = $3 
       RETURNING *`,
      [isCancelled, date, lessonNumber]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Занятие не найдено' };
    }

    return { 
      success: true, 
      lesson: result.rows[0],
      message: isCancelled ? 'Занятие отменено' : 'Занятие возобновлено'
    };
  } catch (err) {
    console.error('Ошибка при обновлении статуса занятия:', err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
};

// Функция для обновления занятия
export const updateLesson = async (date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE lessons 
       SET first_half_subject = $1, second_half_subject = $2, room_first_half = $3, room_second_half = $4
       WHERE date = $5 AND lesson_number = $6
       RETURNING *`,
      [firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf, date, lessonNumber]
    );
    return { success: true, lesson: result.rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
};

// Функция для получения пользователя по имени
export const getUserByUsername = async (username) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT u.*, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = $1
    `, [username]);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Функция для создания пользователя
export const createUser = async (username, password, roleId, fullName) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO users (username, password, role_id, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *, (SELECT name FROM roles WHERE role_id = $3) as role_name
    `, [username, password, roleId, fullName]);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Функция для копирования расписания на следующую неделю
export const copyScheduleToNextWeek = async (currentWeekDates, nextWeekDates) => {
  const client = await pool.connect();
  try {
    // Начинаем транзакцию
    await client.query('BEGIN');

    // Для каждой даты текущей недели
    for (let i = 0; i < currentWeekDates.length; i++) {
      const currentDate = currentWeekDates[i];
      const nextDate = nextWeekDates[i];

      console.log(`Копирование с ${currentDate} на ${nextDate}`);

      // Получаем все занятия на текущую дату
      const currentLessons = await client.query(
        `SELECT l.*, lt.first_half_start, lt.first_half_end, 
                lt.second_half_start, lt.second_half_end, lt.break_duration
         FROM lessons l
         LEFT JOIN lesson_times lt ON l.lesson_number = lt.lesson_number
         WHERE l.date = $1
         ORDER BY l.lesson_number`,
        [currentDate]
      );

      console.log(`Найдено занятий для копирования: ${currentLessons.rows.length}`);

      // Копируем каждое занятие на следующую неделю
      for (const lesson of currentLessons.rows) {
        // Проверяем, существует ли уже занятие на эту дату и номер
        const existingLesson = await client.query(
          'SELECT * FROM lessons WHERE date = $1 AND lesson_number = $2',
          [nextDate, lesson.lesson_number]
        );

        if (existingLesson.rows.length > 0) {
          // Обновляем существующее занятие
          await client.query(
            `UPDATE lessons 
             SET first_half_subject = $1,
                 second_half_subject = $2,
                 room = $3,
                 is_cancelled = $4
             WHERE date = $5 AND lesson_number = $6
             RETURNING *`,
            [
              lesson.first_half_subject,
              lesson.second_half_subject,
              lesson.room,
              lesson.is_cancelled,
              nextDate,
              lesson.lesson_number
            ]
          );
        } else {
          // Создаем новое занятие
          await client.query(
            `INSERT INTO lessons 
             (date, lesson_number, first_half_subject, second_half_subject, room, is_cancelled)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              nextDate,
              lesson.lesson_number,
              lesson.first_half_subject,
              lesson.second_half_subject,
              lesson.room,
              lesson.is_cancelled
            ]
          );
        }
      }
    }

    // Завершаем транзакцию
    await client.query('COMMIT');

    // Получаем обновленное расписание для следующей недели
    const updatedSchedule = await client.query(
      `SELECT l.*, lt.first_half_start, lt.first_half_end, 
              lt.second_half_start, lt.second_half_end, lt.break_duration
       FROM lessons l
       LEFT JOIN lesson_times lt ON l.lesson_number = lt.lesson_number
       WHERE l.date = ANY($1)
       ORDER BY l.date, l.lesson_number`,
      [nextWeekDates]
    );

    console.log(`Скопировано занятий: ${updatedSchedule.rows.length}`);

    return { 
      success: true, 
      message: 'Расписание успешно скопировано',
      schedule: updatedSchedule.rows 
    };
  } catch (err) {
    // В случае ошибки откатываем транзакцию
    await client.query('ROLLBACK');
    console.error('Ошибка при копировании расписания:', err);
    return { 
      success: false, 
      error: err.message 
    };
  } finally {
    client.release();
  }
};

// Функция для просмотра данных в таблице lessons
export const viewLessonsData = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM lessons ORDER BY date, lesson_number');
    console.log('Данные в таблице lessons:', result.rows);
    return result.rows;
  } catch (err) {
    console.error('Ошибка при получении данных:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Функция для создания тестовых данных
export async function createTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Удаляем существующие записи
    await client.query('DELETE FROM lessons');
    await client.query('DELETE FROM subjects');
    await client.query('DELETE FROM rooms');
    
    // Добавляем тестовые предметы
    const subjects = [
      'Математика',
      'Физика',
      'Информатика',
      'История',
      'Литература',
      'Химия',
      'Биология',
      'География',
      'Английский язык',
      'Физкультура'
    ];
    
    for (const subject of subjects) {
      await client.query('INSERT INTO subjects (name) VALUES ($1)', [subject]);
    }
    
    // Добавляем тестовые аудитории
    const rooms = [
      'Ауд. 101',
      'Ауд. 102',
      'Ауд. 103',
      'Ауд. 201',
      'Ауд. 202',
      'Ауд. 203',
      'Ауд. 301',
      'Ауд. 302',
      'Ауд. 303',
      'Ауд. 401'
    ];
    
    for (const room of rooms) {
      await client.query('INSERT INTO rooms (name) VALUES ($1)', [room]);
    }
    
    await client.query('COMMIT');
    return { success: true, message: 'Тестовые данные успешно созданы' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const updateLessonHalfStatus = async (date, lessonNumber, half, isCancelled) => {
  const client = await pool.connect();
  try {
    let field = half === 'first' ? 'is_cancelled_first_half' : 'is_cancelled_second_half';
    const result = await client.query(
      `UPDATE lessons SET ${field} = $1 WHERE date = $2 AND lesson_number = $3 RETURNING *`,
      [isCancelled, date, lessonNumber]
    );
    if (result.rows.length === 0) {
      return { success: false, error: 'Занятие не найдено' };
    }
    return { success: true, lesson: result.rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
};

export default pool; 