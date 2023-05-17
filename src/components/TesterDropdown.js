import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import NavDropdown from 'react-bootstrap/NavDropdown';

import { setTesterMod } from '../actions/loginActions';

// const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;

const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN', 'No']

const TesterDropdown = () => {
  const dispatch = useDispatch();
  const testerMod = useSelector(state => state.isLogged.testerMod);
  return (
    <NavDropdown title={ (testerMod === 'No') ? 'Tester' : 'Tester ' + testerMod } id="tester-nav-dropdown">
      { mods.map( (mod) => (<NavDropdown.Item key={`testerDropdown ${mod}`} onClick={() => dispatch(setTesterMod(mod))}>{mod}</NavDropdown.Item>) ) }
    </NavDropdown>
  )
}

export default TesterDropdown
