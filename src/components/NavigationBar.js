import React, { useState, useCallback } from 'react';
import { Link  } from 'react-router-dom';
// import logo from '../images/alliance_logo.png';
import { useSelector } from 'react-redux';


import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
// import NavDropdown from 'react-bootstrap/NavDropdown';

import Login from './Login'
import SigninHelp from './SigninHelp'
import TesterDropdown from './TesterDropdown'
import DevToolsDropdown from './DevToolsDropdown'


const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
let navClass = "Navbar";
let homeLabel = "Prod";
if (devOrStageOrProd === 'prod') { }
  else if (devOrStageOrProd === 'stage') { navClass = "Navbar-stage"; homeLabel = "Stage"; }
  else { navClass = "Navbar-dev"; homeLabel = devOrStageOrProd; }

const NavigationBar = () => {
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const cognitoTester = useSelector(state => state.isLogged.cognitoTester);
  const [expanded, setExpanded] = useState(false);

  const closeMenu = useCallback(() => setExpanded(false), []);

  return (
  <Navbar className={`${navClass} navbar-custom-expand`} expanded={expanded} onToggle={setExpanded}>
    <Navbar.Toggle aria-controls="main-navbar-nav" onClick={() => setExpanded(!expanded)} />
    <Navbar.Collapse id="main-navbar-nav">
      {/* Close button for mobile sidebar */}
      <div className="navbar-mobile-only navbar-close-row">
        <button
          className="navbar-close-btn"
          onClick={closeMenu}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      {/* Empty spacer for balance on desktop */}
      <div className="navbar-desktop-only" style={{ width: '150px' }}></div>
      <Nav className="mx-auto navbar-main-links">
        <Nav.Link className="navbar_link">{homeLabel}</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/search" onClick={closeMenu}>Search</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/biblio" onClick={closeMenu}>Biblio Edit</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/sort" onClick={closeMenu}>Sort</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/tracker" onClick={closeMenu}>Tracker</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/create" onClick={closeMenu}>Create</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/merge" onClick={closeMenu}>Merge</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/reports" onClick={closeMenu}>Reports</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/download" onClick={closeMenu}>Download</Nav.Link>
        <Nav.Link className="navbar_link" as={Link} to="/bulkSubmission" onClick={closeMenu}>Bulk Submission</Nav.Link>
        <Nav.Link className="navbar_link" as="a" href={process.env.REACT_APP_RESTAPI + "/docs"} target="_blank">Swagger</Nav.Link>
      </Nav>
      <Nav className="navbar-right-links">
        <DevToolsDropdown />
        { (cognitoMod === 'No' || cognitoTester === false) ? <SigninHelp /> : <TesterDropdown /> }
        <Login />
      </Nav>
    </Navbar.Collapse>
    {/* Backdrop overlay to close menu when clicking outside */}
    {expanded && (
      <div
        className="navbar-mobile-only"
        onClick={closeMenu}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1040
        }}
      />
    )}
  </Navbar>
  )
}

//       <Nav.Link as={Link} to="/">{homeLabel}</Nav.Link>
//       <Nav.Link as={Link} to="/flags">Flags & Tags</Nav.Link>
//       <Nav.Link as={Link} to="/files">Files</Nav.Link>
//       <NavDropdown title="Mining" id="basic-nav-dropdown">
//         <NavDropdown.Item as={Link} to="/mining">All Mining</NavDropdown.Item>
//         <NavDropdown.Item as={Link} to="/ontomate">Ontomate</NavDropdown.Item>
//         <NavDropdown.Item as={Link} to="/textpresso">Textpresso</NavDropdown.Item>
//       </NavDropdown>
//       <Nav.Link as={Link} to="/about">About</Nav.Link>

//<Nav.Link as={Link} to="/login">Login</Nav.Link>
//      <Nav.Link as={Link} to="/login">Login</Nav.Link>
//   <Navbar bg="dark" variant="dark" >
//     <Nav variant="tabs" className="justify-content-center"  style={{ flex: 1}}>
//     <Navbar.Brand><img src={logo} className="Alliance-logo" alt="logo" /></Navbar.Brand>
//         <NavDropdown.Divider />

export default NavigationBar
