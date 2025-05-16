import { useState, useEffect } from 'react';
import '../styles/StudentSchedule.css';

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

const StudentSchedule = ({ user, onLogout }) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [schedule, setSchedule] = useState({});

  const getWeekDates = () => {
    const today = new Date('2025-05-12');
    const dates = [];
    const monday = new Date(today);
    monday.setDate(today.getDate() + (currentWeek * 7));
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    for (let i = 0; i < 6; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(12, 0, 0, 0);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][i],
        formattedDate: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const fetchSchedule = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/schedule');
      if (!response.ok) throw new Error('Не удалось загрузить расписание');
      const data = await response.json();
      const formattedSchedule = {};
      weekDates.forEach(({ date }) => {
        formattedSchedule[date] = Array(6).fill(null).map((_, index) => ({
          id: Date.now() + index,
          lessonNumber: index + 1,
          time: lessonTimes[index],
          firstHalfSubject: null,
          secondHalfSubject: null,
          room: null,
          isCancelled: false
        }));
      });
      data.forEach(lesson => {
        const lessonDate = new Date(lesson.date);
        lessonDate.setHours(12, 0, 0, 0);
        const localDate = lessonDate.toISOString().split('T')[0];
        if (formattedSchedule[localDate]) {
          const lessonIndex = lesson.lesson_number - 1;
          formattedSchedule[localDate][lessonIndex] = {
            ...formattedSchedule[localDate][lessonIndex],
            firstHalfSubject: lesson.first_half_subject,
            secondHalfSubject: lesson.second_half_subject,
            room: lesson.room,
            isCancelled: lesson.is_cancelled
          };
        }
      });
      setSchedule(formattedSchedule);
    } catch (error) {
      console.error('Ошибка при загрузке расписания:', error);
      alert('Не удалось загрузить расписание');
    }
  };

  useEffect(() => { fetchSchedule(); }, []);
  useEffect(() => { fetchSchedule(); }, [currentWeek]);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => prev + direction);
  };

  const getWeekRange = () => {
    const firstDate = weekDates[0].formattedDate;
    const lastDate = weekDates[5].formattedDate;
    return `${firstDate} - ${lastDate}`;
  };

  return (
    <div className="student-schedule">
      <div className="student-header">
        <span className="student-name">{user?.fullName}</span>
        <button className="logout-button" onClick={onLogout}>Выйти</button>
      </div>
      <div className="week-navigation">
        <button onClick={() => handleWeekChange(-1)}>Предыдущая неделя</button>
        <span>{getWeekRange()}</span>
        <button onClick={() => handleWeekChange(1)}>Следующая неделя</button>
      </div>
      <div className="schedule-grid">
        {weekDates.map(({ date, dayOfWeek, formattedDate }) => (
          <div key={date} className="schedule-day">
            <h3>{dayOfWeek}, {formattedDate}</h3>
            <div className="lessons-list">
              {schedule[date]?.map((lesson, index) => (
                <div
                  key={index}
                  className={`lesson-item ${
                    (lesson.firstHalfSubject || lesson.secondHalfSubject)
                      ? 'has-lesson'
                      : 'no-lesson'
                  }`}
                >
                  {lesson ? (
                    <>
                      <div className="lesson-info">
                        <span className="lesson-number">{lesson.lessonNumber} пара</span>
                        <div className="lesson-time">
                          <div className="lesson-half">
                            <span>1 половина: {lesson.time.firstHalf.start} - {lesson.time.firstHalf.end}</span>
                            {lesson.firstHalfSubject ? (
                              <span className="lesson-subject">{lesson.firstHalfSubject}</span>
                            ) : (
                              <span className="no-subject">Нет предмета</span>
                            )}
                          </div>
                          <div className="break">{lesson.time.break}</div>
                          <div className="lesson-half">
                            <span>2 половина: {lesson.time.secondHalf.start} - {lesson.time.secondHalf.end}</span>
                            {lesson.secondHalfSubject ? (
                              <span className="lesson-subject">{lesson.secondHalfSubject}</span>
                            ) : (
                              <span className="no-subject">Нет предмета</span>
                            )}
                          </div>
                        </div>
                        {lesson.room && <div className="lesson-room">Аудитория: {lesson.room}</div>}
                        {lesson.isCancelled && <div className="lesson-cancelled">Занятие отменено</div>}
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

export default StudentSchedule; 