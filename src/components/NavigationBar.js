import { Link  } from 'react-router-dom';
// import logo from '../images/alliance_logo.png';


import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Login from './Login'
import {oktaSignInConfig} from "../config";


const NavigationBar = () => {
  return (
  <Navbar className="Navbar" >
    <Nav className="justify-content-center"  style={{ flex: 1}}>
      <Nav.Link as={Link} to="/">Home</Nav.Link>
      <Nav.Link as={Link} to="/query">Query</Nav.Link>
      <Nav.Link as={Link} to="/biblio">Biblio</Nav.Link>
      <Nav.Link as={Link} to="/flags">Flags & Tags</Nav.Link>
      <Nav.Link as={Link} to="/files">Files</Nav.Link>
      <NavDropdown title="Mining" id="basic-nav-dropdown">
        <NavDropdown.Item as={Link} to="/mining">All Mining</NavDropdown.Item>
        <NavDropdown.Item as={Link} to="/ontomate">Ontomate</NavDropdown.Item>
        <NavDropdown.Item as={Link} to="/textpresso">Textpresso</NavDropdown.Item>
      </NavDropdown>
      <Nav.Link as={Link} to="/create">Create</Nav.Link>
      <Nav.Link as={Link} to="/about">About</Nav.Link>
      <Nav.Link as={Link} to="/swaggerUI">Swagger</Nav.Link>
    </Nav>

    <Nav className="pull-right">
      <Login config={oktaSignInConfig}/>
    </Nav>

  </Navbar>
  )
}
//<Nav.Link as={Link} to="/login">Login</Nav.Link>
//      <Nav.Link as={Link} to="/login">Login</Nav.Link>
//   <Navbar bg="dark" variant="dark" >
//     <Nav variant="tabs" className="justify-content-center"  style={{ flex: 1}}>
//     <Navbar.Brand><img src={logo} className="Alliance-logo" alt="logo" /></Navbar.Brand>
//         <NavDropdown.Divider />

export default NavigationBar
