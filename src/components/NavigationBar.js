import { Link  } from 'react-router-dom';
// import logo from '../images/alliance_logo.png';
import { useSelector } from 'react-redux';


import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
// import NavDropdown from 'react-bootstrap/NavDropdown';

import Login from './Login'
import OktaHelp from './OktaHelp'
import TesterDropdown from './TesterDropdown'

import {oktaSignInConfig} from "../config";


const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
let navClass = "Navbar";
let homeLabel = "Prod";
if (devOrStageOrProd === 'prod') { }
  else if (devOrStageOrProd === 'stage') { navClass = "Navbar-stage"; homeLabel = "Stage"; }
  else { navClass = "Navbar-dev"; homeLabel = devOrStageOrProd; }

const NavigationBar = () => {
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const oktaTester = useSelector(state => state.isLogged.oktaTester);
  return (
  <Navbar className={navClass} >
    <Nav className="justify-content-center"  style={{ flex: 1}}>
      <Nav.Link className="navbar_link" >{homeLabel}</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/search">Search</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/biblio">Biblio Edit</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/sort">Sort</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/tracker">Tracker</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/create">Create</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/merge">Merge</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/reports">Reports</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/download">Download</Nav.Link>
      <Nav.Link className="navbar_link" as={Link} to="/bulkSubmission">Bulk Submission</Nav.Link>
      <Nav.Link className="navbar_link" as="a" href={process.env.REACT_APP_RESTAPI + "/docs"} target="_blank">Swagger</Nav.Link>
    </Nav>
    <Nav>
      { (oktaMod === 'No' || oktaTester === false) ? <OktaHelp /> : <TesterDropdown /> }
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
