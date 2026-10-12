import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { TimelineEvent } from '../types';
import { useApp } from '../context/AppContext';
import { Card, EmptyState, ErrorState, Skeleton, Button } from './UI';
export const RecentActivity: React.FC = () => {
 const {navigate}=useApp();const [events,setEvents]=useState<TimelineEvent[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let active=true;api.getTimeline().then(data=>{if(active)setEvents([...data].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3));}).catch(()=>{if(active)setError('Recent activity could not be loaded.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 return <Card title="Your recent activity">{loading?<Skeleton label="Loading activity"/>:error?<ErrorState message={error}/>:events.length ? events.map(event=><div className="ui-activity-row" key={event.id}><time>{event.date}</time><div><strong>{event.title}</strong><p>{event.summary}</p></div></div>):<EmptyState title="Your story starts here">Activity will appear as you add records and visit plans.</EmptyState>}<div className="ui-quick-links"><Button variant="outline" onClick={()=>navigate('timeline')}>Open timeline</Button><Button variant="outline" onClick={()=>navigate('passport')}>Medical documents</Button><Button variant="ghost" onClick={()=>navigate('messages')}>Care messages</Button></div></Card>;
};
