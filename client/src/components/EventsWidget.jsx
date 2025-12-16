import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './EventsWidget.css';

const EventsWidget = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/members/events');
        setEvents(res.data);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getDaysUntil = (dateString) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateString);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow';
    return `in ${diffDays} days`;
  };

  if (loading) return <div className="events-widget loading">Loading events...</div>;
  if (events.length === 0) return null; // Don't show if no events

  return (
    <div className="events-widget">
      <h3 className="events-title">📅 Upcoming Family Events</h3>
      <div className="events-list">
        {events.map(event => (
          <div key={event.id} className={`event-item ${event.type.toLowerCase()}`}>
            <div className="event-date">
              <span className="day">{new Date(event.date).getDate()}</span>
              <span className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div className="event-details">
              <div className="event-name">{event.name}</div>
              <div className="event-type">
                {event.type === 'Birthday' ? '🎂 ' : '💍 '}
                {event.type} • {event.type === 'Birthday' ? `Turning ${event.age}` : `${event.years} Years`}
              </div>
            </div>
            <div className={`event-days ${getDaysUntil(event.date) === 'Today!' ? 'today' : ''}`}>
              {getDaysUntil(event.date)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsWidget;
