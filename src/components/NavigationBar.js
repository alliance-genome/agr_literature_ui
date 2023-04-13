import { Link  } from 'react-router-dom';
// import logo from '../images/alliance_logo.png';


import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
// import NavDropdown from 'react-bootstrap/NavDropdown';

import Login from './Login'
import OktaHelp from './OktaHelp'

import {oktaSignInConfig} from "../config";


const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
let navClass = "Navbar";
let homeLabel = "Prod";
if (devOrStageOrProd === 'prod') { }
  else if (devOrStageOrProd === 'stage') { navClass = "Navbar-stage"; homeLabel = "Stage"; }
  else { navClass = "Navbar-dev"; homeLabel = devOrStageOrProd; }

const NavigationBar = () => {
  return (
  <Navbar className={navClass} >
    <Nav className="justify-content-center"  style={{ flex: 1}}>
      <Nav.Link >{homeLabel}</Nav.Link>
      <Nav.Link as={Link} to="/search">Search</Nav.Link>
      <Nav.Link as={Link} to="/biblio">Biblio Edit</Nav.Link>
      <Nav.Link as={Link} to="/sort">Sort</Nav.Link>
      <Nav.Link as={Link} to="/tracker">Tracker</Nav.Link>
      <Nav.Link as={Link} to="/create">Create</Nav.Link>
      <Nav.Link as={Link} to="/merge">Merge</Nav.Link>
      <Nav.Link as={Link} to="/download">Download</Nav.Link>
      <Nav.Link as="a" href={process.env.REACT_APP_RESTAPI + "/docs"} target="_blank">Swagger</Nav.Link>
    </Nav>
    <Nav>
      <OktaHelp />
      <Login config={oktaSignInConfig}/>
    </Nav>
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
