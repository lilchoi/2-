import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  initializeDb, 
  getSubjects, 
  addSubject, 
  deleteSubject,
  getSchedule,
  updateLessonStatus,
  updateLesson,
  getUserByUsername,
  createUser,
  copyScheduleToNextWeek,
  addLesson,
  createTestData,
  viewLessonsData,
  deleteLesson,
  updateLessonHalfStatus
} from './db.js';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация БД
initializeDb();

// Роуты аутентификации
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Необходимо указать имя пользователя и пароль' });
    }
    
    const user = await getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role_name,
      fullName: user.full_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, roleId, fullName } = req.body;
    
    if (!username || !password || !roleId || !fullName) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    
    const newUser = await createUser(username, password, roleId, fullName);
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role_name,
      fullName: newUser.full_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Роуты

// Получить все предметы
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await getSubjects();
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить предмет
app.post('/api/subjects', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Название предмета обязательно' });
    }
    
    const newSubject = await addSubject(name);
    res.status(201).json(newSubject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить предмет
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deletedSubject = await deleteSubject(id);
    
    if (!deletedSubject) {
      return res.status(404).json({ error: 'Предмет не найден' });
    }
    
    res.json(deletedSubject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить расписание
app.get('/api/schedule', async (req, res) => {
  try {
    const schedule = await getSchedule();
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить занятие
app.post('/api/schedule', async (req, res) => {
  try {
    const { date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf } = req.body;
    
    if (!date || !lessonNumber) {
      return res.status(400).json({ error: 'Необходимо указать дату и номер пары' });
    }
    
    const newLesson = await addLesson(date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf);
    res.status(201).json(newLesson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить статус занятия (отмена/возобновление)
app.patch('/api/schedule/:date/:lessonNumber/status', async (req, res) => {
  try {
    const { date, lessonNumber } = req.params;
    const { isCancelled } = req.body;
    
    const result = await updateLessonStatus(date, parseInt(lessonNumber), isCancelled);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (err) {
    console.error('Ошибка при обновлении статуса занятия:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить занятие
app.put('/api/schedule/:date/:lessonNumber', async (req, res) => {
  try {
    const { date, lessonNumber } = req.params;
    const { firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf } = req.body;
    
    const result = await updateLesson(date, lessonNumber, firstHalfSubject, secondHalfSubject, roomFirstHalf, roomSecondHalf);
    
    if (!result.success) {
      return res.status(404).json({ error: 'Занятие не найдено' });
    }
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Копирование расписания на следующую неделю
app.post('/api/schedule/copy', async (req, res) => {
  try {
    const { currentWeekDates, nextWeekDates } = req.body;

    if (!currentWeekDates || !nextWeekDates) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать даты текущей и следующей недели' 
      });
    }

    console.log('Копирование расписания:', {
      currentWeekDates,
      nextWeekDates
    });

    const result = await copyScheduleToNextWeek(currentWeekDates, nextWeekDates);
    console.log('Результат копирования:', result);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Ошибка при копировании расписания:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Создание тестовых данных
app.post('/api/test-data', async (req, res) => {
  try {
    const result = await createTestData();
    res.json(result);
  } catch (error) {
    console.error('Ошибка при создании тестовых данных:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Просмотр данных в таблице lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await viewLessonsData();
    res.json(lessons);
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Удалить занятие
app.delete('/api/schedule/:date/:lessonNumber', async (req, res) => {
  try {
    const { date, lessonNumber } = req.params;
    const result = await deleteLesson(date, parseInt(lessonNumber));
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка при удалении занятия:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PATCH для отмены/восстановления половины пары (ДОЛЖЕН БЫТЬ ВЫШЕ других /api/schedule/:date/:lessonNumber)
app.patch('/api/schedule/:date/:lessonNumber/half/:half/status', async (req, res) => {
  try {
    const { date, lessonNumber, half } = req.params;
    const { isCancelled } = req.body;
    const result = await updateLessonHalfStatus(date, parseInt(lessonNumber), half, isCancelled);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 