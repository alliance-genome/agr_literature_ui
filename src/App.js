// import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Route } from 'react-router-dom'
import history from "./history";

import NavigationBar from './components/NavigationBar'
import Home from './components/Home'
import Query from './components/Query'
import Biblio from './components/Biblio'
import Flags from './components/Flags'
import Files from './components/Files'
import Mining from './components/Mining'
import Ontomate from './components/Ontomate'
import Textpresso from './components/Textpresso'
import Create from './components/Create'
import About from './components/About'
import Login from './components/Login'
// import ListGroup from 'react-bootstrap/ListGroup';
// import Navbar from 'react-bootstrap/Navbar';
// import Nav from 'react-bootstrap/Nav';
// import NavItem from 'react-bootstrap/NavItem';
// import NavDropdown from 'react-bootstrap/NavDropdown';
// import Glyphicon from 'react-bootstrap/Glyphicon';




function App() {
  return (
    <BrowserRouter history={history}>
    <div className="App">
      <NavigationBar />
 {/*
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
  */}
      <br />
      <Route path='/' exact component={Home}/>
      <Route path='/query' component={Query} />
      <Route path='/biblio' component={Biblio} />
      <Route path='/flags' component={Flags} />
      <Route path='/files' component={Files} />
      <Route path='/mining' component={Mining} />
      <Route path='/ontomate' component={Ontomate} />
      <Route path='/textpresso' component={Textpresso} />
      <Route path='/create' component={Create} />
      <Route path='/about' component={About} />
      <Route path='/login' component={Login} />
    </div>
    </BrowserRouter>
  );
}

// this doesn't seem true.  Using Router instead of BrowserRouter makes the <Link and <Redirect reset store
// Warning: <BrowserRouter> ignores the history prop. To use a custom history, use `import { Router }` instead of `import { BrowserRouter as Router }`.
//     <BrowserRouter history={history}>
//     </BrowserRouter>

export default App;
