import { useState, useEffect } from 'react';
import '../styles/SubjectManagement.css';

function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/subjects');
      
      if (!response.ok) {
        throw new Error('Не удалось получить список предметов');
      }
      
      const data = await response.json();
      setSubjects(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    
    if (!newSubject.trim()) {
      setError('Название предмета не может быть пустым');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newSubject }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось добавить предмет');
      }
      
      const addedSubject = await response.json();
      setSubjects([...subjects, addedSubject]);
      setNewSubject('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSubject = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/subjects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Не удалось удалить предмет');
      }
      
      // Обновляем локальное состояние
      setSubjects(subjects.filter(subject => subject.subjects_id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка предметов...</div>;
  }

  return (
    <div className="subject-management">
      <h2>Управление списком предметов</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form className="add-subject-form" onSubmit={addSubject}>
        <div className="form-group">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Название нового предмета"
            className="subject-input"
          />
          <button type="submit" className="add-button">Добавить предмет</button>
        </div>
      </form>
      
      <div className="subjects-list">
        <h3>Список доступных предметов</h3>
        
        {subjects.length === 0 ? (
          <p className="no-subjects">Предметы не найдены</p>
        ) : (
          <ul>
            {subjects.map((subject) => (
              <li key={subject.subjects_id} className="subject-item">
                <span className="subject-name">{subject.name}</span>
                <button 
                  className="delete-button"
                  onClick={() => deleteSubject(subject.subjects_id)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SubjectManagement; 