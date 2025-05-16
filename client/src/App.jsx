import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import './App.css'

// Компоненты
import StudentSchedule from './components/StudentSchedule'
import TeacherSchedule from './components/TeacherSchedule'
import SubjectManagement from './components/SubjectManagement'
import Auth from './components/Auth'

function App() {
  const [user, setUser] = useState(() => {
    // При инициализации проверяем localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    // Сохраняем данные пользователя в localStorage
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    // Удаляем данные пользователя из localStorage
    localStorage.removeItem('user');
  };

  // Если пользователь не авторизован, показываем форму входа
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Ограничение доступа по роли
  if (user.role === 'teacher') {
    return <TeacherSchedule user={user} onLogout={handleLogout} />;
  } else {
    return <StudentSchedule user={user} onLogout={handleLogout} />;
  }
}

export default App
