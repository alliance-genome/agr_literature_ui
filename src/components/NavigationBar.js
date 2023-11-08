import { Link  } from 'react-router-dom';
import { useSelector } from 'react-redux';


import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

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
      { (oktaMod === 'No' || oktaTester === false) ? <OktaHelp /> : <TesterDropdown /> }
      <Login config={oktaSignInConfig}/>
    </Nav>
  </Navbar>
  )
}

export default NavigationBar
