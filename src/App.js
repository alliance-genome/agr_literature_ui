// import logo from './logo.svg';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppWithRouterAccess from './components/AppWithRouterAccess';

const App = () => (
    <Router>
      <AppWithRouterAccess/>
    </Router>
);
export default App;
