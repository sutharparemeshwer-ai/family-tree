import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Main from './pages/Main';
import Tree from './pages/Tree';
import SharedTree from './pages/SharedTree';
import Memories from './pages/Memories';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/main" element={<Main />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/view/:token" element={<SharedTree />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/memories/:memberId" element={<Memories />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Navigate to="/signup" />} />
      </Routes>
    </Router>
  );
}

export default App;

