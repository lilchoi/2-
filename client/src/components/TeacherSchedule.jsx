import { useState, useEffect } from 'react';
import '../styles/TeacherSchedule.css';

const TeacherSchedule = ({ user, onLogout }) => {
  // Временные интервалы пар с учетом перерывов
  const lessonTimes = [
    { 
      number: 1, 
      firstHalf: { start: '09:00', end: '09:50' },
      secondHalf: { start: '09:55', end: '10:40' },
      break: 'Перерыв 5 минут'
    },
    { 
      number: 2, 
      firstHalf: { start: '10:50', end: '11:35' },
      secondHalf: { start: '11:40', end: '12:30' },
      break: 'Перерыв 5 минут'
    },
    { 
      number: 3, 
      firstHalf: { start: '13:15', end: '14:00' },
      secondHalf: { start: '14:05', end: '14:55' },
      break: 'Перерыв 5 минут'
    },
    { 
      number: 4, 
      firstHalf: { start: '15:05', end: '15:50' },
      secondHalf: { start: '15:55', end: '16:45' },
      break: 'Перерыв 5 минут'
    },
    { 
      number: 5, 
      firstHalf: { start: '16:55', end: '17:40' },
      secondHalf: { start: '17:45', end: '18:35' },
      break: 'Перерыв 5 минут'
    },
    { 
      number: 6, 
      firstHalf: { start: '18:45', end: '19:30' },
      secondHalf: { start: '19:35', end: '20:25' },
      break: 'Перерыв 5 минут'
    }
  ];

  const [currentWeek, setCurrentWeek] = useState(0);
  const [subjects, setSubjects] = useState([]);

  // Функция для получения дат недели
  const getWeekDates = () => {
    const today = new Date('2025-05-12');
    const dates = [];
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + (currentWeek * 7));
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      // Устанавливаем время в полдень, чтобы избежать проблем с часовыми поясами
      date.setHours(12, 0, 0, 0);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][i],
        formattedDate: date.toLocaleDateString('ru-RU', { 
          day: 'numeric', 
          month: 'long'
        })
      });
    }
    
    return dates;
  };

  const weekDates = getWeekDates();

  const [selectedDate, setSelectedDate] = useState(weekDates[0].date);
  const [selectedHalf, setSelectedHalf] = useState('first');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLessonNumber, setSelectedLessonNumber] = useState(1);
  const [selectedRoomFirstHalf, setSelectedRoomFirstHalf] = useState('');
  const [selectedRoomSecondHalf, setSelectedRoomSecondHalf] = useState('');

  const [schedule, setSchedule] = useState({});

  // Функция для загрузки расписания с сервера
  const fetchSchedule = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/schedule');
      if (!response.ok) {
        throw new Error('Не удалось загрузить расписание');
      }
      const data = await response.json();
      
      // Преобразуем данные в нужный формат
      const formattedSchedule = {};
      
      // Создаем пустую структуру для всех дат текущей недели
      weekDates.forEach(({ date }) => {
        formattedSchedule[date] = Array(6).fill(null).map((_, index) => ({
          id: Date.now() + index,
          lessonNumber: index + 1,
          time: lessonTimes[index],
          firstHalfSubject: null,
          secondHalfSubject: null,
          roomFirstHalf: null,
          roomSecondHalf: null
        }));
      });
      
      // Заполняем данными из базы
      data.forEach(lesson => {
        // Преобразуем дату из UTC в локальный формат
        const lessonDate = new Date(lesson.date);
        lessonDate.setHours(12, 0, 0, 0); // Устанавливаем время в полдень
        const localDate = lessonDate.toISOString().split('T')[0];
        
        if (formattedSchedule[localDate]) {
          const lessonIndex = lesson.lesson_number - 1;
          formattedSchedule[localDate][lessonIndex] = {
            ...formattedSchedule[localDate][lessonIndex],
            firstHalfSubject: lesson.first_half_subject,
            secondHalfSubject: lesson.second_half_subject,
            roomFirstHalf: lesson.room_first_half,
            roomSecondHalf: lesson.room_second_half,
            isCancelledFirstHalf: lesson.is_cancelled_first_half,
            isCancelledSecondHalf: lesson.is_cancelled_second_half
          };
        }
      });
      
      setSchedule(formattedSchedule);
    } catch (error) {
      console.error('Ошибка при загрузке расписания:', error);
      alert('Не удалось загрузить расписание');
    }
  };

  // Загружаем расписание при монтировании компонента
  useEffect(() => {
    fetchSchedule();
  }, []);

  // Загружаем расписание при изменении недели
  useEffect(() => {
    fetchSchedule();
  }, [currentWeek]);

  // Загружаем список предметов при монтировании компонента
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/subjects');
        if (!response.ok) {
          throw new Error('Не удалось загрузить список предметов');
        }
        const data = await response.json();
        setSubjects(data);
      } catch (err) {
        console.error('Ошибка при загрузке предметов:', err);
      }
    };
    
    fetchSubjects();
  }, []);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => prev + direction);
  };

  const getWeekRange = () => {
    const firstDate = weekDates[0].formattedDate;
    const lastDate = weekDates[5].formattedDate;
    return `${firstDate} - ${lastDate}`;
  };

  const copyScheduleToNextWeek = async () => {
    try {
      // Получаем даты текущей недели
      const currentWeekDates = weekDates.map(({ date }) => date);
      
      // Получаем даты следующей недели
      const nextWeekDates = currentWeekDates.map(date => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 7);
        return nextDate.toISOString().split('T')[0];
      });

      console.log('Отправляем данные:', {
        currentWeekDates,
        nextWeekDates
      });

      const response = await fetch('http://localhost:5000/api/schedule/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentWeekDates,
          nextWeekDates
        }),
      });

      const data = await response.json();
      console.log('Получен ответ:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при копировании расписания');
      }

      if (data.success && data.schedule) {
        // Обновляем состояние с новым расписанием
        setSchedule(prevSchedule => {
          const newSchedule = { ...prevSchedule };
          
          // Обрабатываем каждое занятие из ответа
          data.schedule.forEach(lesson => {
            // Преобразуем дату из UTC в локальный формат
            const date = new Date(lesson.date).toISOString().split('T')[0];
            
            if (!newSchedule[date]) {
              newSchedule[date] = Array(6).fill(null).map((_, index) => ({
                id: Date.now() + index,
                lessonNumber: index + 1,
                time: lessonTimes[index],
                firstHalfSubject: null,
                secondHalfSubject: null,
                roomFirstHalf: null,
                roomSecondHalf: null
              }));
            }

            // Находим индекс урока
            const lessonIndex = lesson.lesson_number - 1;
            
            // Обновляем данные урока
            newSchedule[date][lessonIndex] = {
              ...newSchedule[date][lessonIndex],
              firstHalfSubject: lesson.first_half_subject,
              secondHalfSubject: lesson.second_half_subject,
              roomFirstHalf: lesson.room_first_half,
              roomSecondHalf: lesson.room_second_half
            };
          });

          return newSchedule;
        });

        alert(data.message || 'Расписание успешно скопировано');
      } else {
        throw new Error(data.error || 'Ошибка при копировании расписания');
      }
    } catch (error) {
      console.error('Ошибка при копировании расписания:', error);
      alert(error.message);
    }
  };

  const handleAddLesson = async () => {
    if (!selectedSubject) return;

    try {
      // Создаем дату в полдень для избежания проблем с часовыми поясами
      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(12, 0, 0, 0);
      const formattedDate = selectedDateObj.toISOString().split('T')[0];

      // Проверяем, существует ли уже занятие на эту дату и номер
      const existingLesson = schedule[formattedDate]?.[selectedLessonNumber - 1];

      let roomFirstHalf = existingLesson?.roomFirstHalf || '';
      let roomSecondHalf = existingLesson?.roomSecondHalf || '';
      if (selectedHalf === 'both') {
        roomFirstHalf = selectedRoomFirstHalf;
        roomSecondHalf = selectedRoomFirstHalf;
      } else if (selectedHalf === 'first') {
        roomFirstHalf = selectedRoomFirstHalf;
      } else if (selectedHalf === 'second') {
        roomSecondHalf = selectedRoomFirstHalf;
      }

      const requestData = {
        date: formattedDate,
        lessonNumber: selectedLessonNumber,
        firstHalfSubject: selectedHalf === 'both' || selectedHalf === 'first' ? selectedSubject : existingLesson?.firstHalfSubject || null,
        secondHalfSubject: selectedHalf === 'both' || selectedHalf === 'second' ? selectedSubject : existingLesson?.secondHalfSubject || null,
        roomFirstHalf,
        roomSecondHalf
      };

      console.log('Отправляемые данные:', requestData);

      const response = await fetch('http://localhost:5000/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось добавить занятие');
      }

      await fetchSchedule(); // Перезагружаем расписание
      setSelectedSubject('');
      setSelectedRoomFirstHalf('');
      setSelectedRoomSecondHalf('');
      alert('Занятие успешно добавлено');
    } catch (error) {
      console.error('Ошибка при добавлении занятия:', error);
      alert(error.message);
    }
  };

  const handleDeleteLesson = async (date, lessonIndex, half) => {
    try {
      const lessonNumber = lessonIndex + 1;
      
      const response = await fetch(`http://localhost:5000/api/schedule/${date}/${lessonNumber}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении занятия');
      }

      if (data.success) {
        // Обновляем состояние после успешного удаления
        setSchedule(prevSchedule => {
          const newSchedule = { ...prevSchedule };
          if (newSchedule[date]) {
            newSchedule[date][lessonIndex] = {
              ...newSchedule[date][lessonIndex],
              firstHalfSubject: null,
              secondHalfSubject: null
            };
          }
          return newSchedule;
        });

        // Перезагружаем расписание
        fetchSchedule();
      } else {
        throw new Error(data.error || 'Ошибка при удалении занятия');
      }
    } catch (error) {
      console.error('Ошибка при удалении занятия:', error);
      alert(error.message);
    }
  };

  const createTestData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/test-data', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании тестовых данных');
      }

      alert('Тестовые данные успешно созданы');
      // Перезагружаем страницу для отображения новых данных
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при создании тестовых данных:', error);
      alert(error.message);
    }
  };

  const handleCancelLesson = async (date, lessonIndex) => {
    try {
      const lessonNumber = lessonIndex + 1;
      const lesson = schedule[date][lessonIndex];
      const isCancelled = !lesson.isCancelled;
      
      const response = await fetch(`http://localhost:5000/api/schedule/${date}/${lessonNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isCancelled }),
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус занятия');
      }

      // Обновляем состояние после успешного обновления
      setSchedule(prevSchedule => {
        const newSchedule = { ...prevSchedule };
        if (newSchedule[date]) {
          newSchedule[date][lessonIndex] = {
            ...newSchedule[date][lessonIndex],
            isCancelled
          };
        }
        return newSchedule;
      });

      // Перезагружаем расписание
      fetchSchedule();
    } catch (error) {
      console.error('Ошибка при обновлении статуса занятия:', error);
      alert(error.message);
    }
  };

  return (
    <div className="teacher-schedule">
      <div className="teacher-header">
        <span className="teacher-name">{user?.fullName}</span>
        <button className="logout-button" onClick={onLogout}>Выйти</button>
      </div>
      <h2>Управление расписанием</h2>
      
      <div className="week-navigation">
        <button onClick={() => handleWeekChange(-1)}>Предыдущая неделя</button>
        <span>{getWeekRange()}</span>
        <button onClick={() => handleWeekChange(1)}>Следующая неделя</button>
        <button onClick={copyScheduleToNextWeek} className="copy-button">
          Копировать на следующую неделю
        </button>
        <button onClick={createTestData} className="test-data-button">
          Создать тестовые данные
        </button>
      </div>

      <div className="schedule-controls">
        <select 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {weekDates.map(({ date, dayOfWeek, formattedDate }) => (
            <option key={`date-${date}`} value={date}>
              {dayOfWeek}, {formattedDate}
            </option>
          ))}
        </select>

        <select 
          value={selectedLessonNumber} 
          onChange={(e) => setSelectedLessonNumber(Number(e.target.value))}
        >
          {lessonTimes.slice(0, 4).map(({ number, firstHalf, secondHalf }) => (
            <option key={`lesson-${number}`} value={number}>
              {number} пара ({firstHalf.start} - {secondHalf.end})
            </option>
          ))}
        </select>

        <select 
          value={selectedHalf}
          onChange={(e) => setSelectedHalf(e.target.value)}
        >
          <option key="first" value="first">1 половина</option>
          <option key="second" value="second">2 половина</option>
          <option key="both" value="both">Вся пара</option>
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option key="default" value="">Выберите предмет</option>
          {subjects.map(subject => (
            <option key={`subject-${subject.subjects_id}`} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Аудитория"
          value={selectedRoomFirstHalf}
          onChange={(e) => {
            setSelectedRoomFirstHalf(e.target.value);
            setSelectedRoomSecondHalf(e.target.value);
          }}
        />

        <button onClick={handleAddLesson}>Добавить занятие</button>
      </div>

      <div className="schedule-grid">
        {weekDates.map(({ date, dayOfWeek, formattedDate }) => (
          <div key={date} className="schedule-day">
            <h3>{dayOfWeek}, {formattedDate}</h3>
            <div className="lessons-list">
              {schedule[date]?.map((lesson, index) => (
                <div key={index} className={`lesson-item ${lesson?.isCancelledFirstHalf && lesson?.isCancelledSecondHalf ? 'cancelled' : ''} ${!lesson?.firstHalfSubject && !lesson?.secondHalfSubject ? 'no-lesson' : ''}`}>
                  {lesson ? (
                    <>
                      <div className="lesson-info">
                        <span className="lesson-number">{lesson.lessonNumber} пара</span>
                        <div className="lesson-time">
                          <div className={`lesson-half`}>
                            <span>1 половина: {lesson.time.firstHalf.start} - {lesson.time.firstHalf.end}</span>
                            {lesson.firstHalfSubject ? (
                              <>
                                <span className="lesson-subject">{lesson.firstHalfSubject}</span>
                                {lesson.roomFirstHalf && (
                                  <span className="lesson-room">Аудитория: {lesson.roomFirstHalf}</span>
                                )}
                                <button 
                                  onClick={() => handleDeleteLesson(date, index, 'first')}
                                  className="delete-button"
                                >Удалить</button>
                              </>
                            ) : (
                              <span className="no-subject">Нет предмета</span>
                            )}
                          </div>
                          <div className="break">{lesson.time.break}</div>
                          <div className={`lesson-half`}>
                            <span>2 половина: {lesson.time.secondHalf.start} - {lesson.time.secondHalf.end}</span>
                            {lesson.secondHalfSubject ? (
                              <>
                                <span className="lesson-subject">{lesson.secondHalfSubject}</span>
                                {lesson.roomSecondHalf && (
                                  <span className="lesson-room">Аудитория: {lesson.roomSecondHalf}</span>
                                )}
                                <button 
                                  onClick={() => handleDeleteLesson(date, index, 'second')}
                                  className="delete-button"
                                >Удалить</button>
                              </>
                            ) : (
                              <span className="no-subject">Нет предмета</span>
                            )}
                          </div>
                        </div>
                        {(lesson.isCancelledFirstHalf || lesson.isCancelledSecondHalf) && <div className="lesson-cancelled">{lesson.isCancelledFirstHalf && lesson.isCancelledSecondHalf ? 'Пара полностью отменена' : lesson.isCancelledFirstHalf ? 'Отменена 1 половина' : 'Отменена 2 половина'}</div>}
                      </div>
                    </>
                  ) : (
                    <div className="no-lesson">
                      {index + 1} пара свободна
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherSchedule; 