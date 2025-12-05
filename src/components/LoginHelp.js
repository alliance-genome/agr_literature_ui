import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import React, { useState } from "react";


const LoginHelp = () => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  return (
    <>
      <Button style={{marginInline: '.5rem', alignSelf: 'center'}} variant="light" size="sm" type="button" onClick={handleShow} title="Authentication is handled through AWS Cognito. Please click here for more information about how to get an account.">Login Help</Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Account Help</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          &nbsp;&nbsp;The Sign In button has a place for Email, enter the one you used for okta sign-in.<br/><br/>
          &nbsp;&nbsp;Some curators already have an AI-curation account, in which case you don't need to create/reset your account, you can use that email and password.<br/><br/>
          &nbsp;&nbsp;If you haven't signed on there, you'll have to reset your password by clicking on "Forgot your password?" and following the directions.  Then you can sign in by putting in the email and the new cognito password.<br/><br/>

          &nbsp;&nbsp;Password requirements<br/>
            &bull; Minimum 12 characters<br/>
            &bull; At least one uppercase letter (A-Z)<br/>
            &bull; At least one lowercase letter (a-z)<br/>
            &bull; At least one number (0-9)<br/>
            &bull; At least one symbol (!@#$%^&*()_-+=)<br/><br/>

          &nbsp;&nbsp;This is not a google sign-in, so you won't be able to sign in by signing on to google with your google password.<br/><br/>

          &nbsp;&nbsp;For help setting up a new account please contact the administrator for your MOD or the Team where you are working.<br/><br/>
          <Container fluid>
            <Row><Col>Chris Tabone</Col><Col>FB</Col><Col>Specialist</Col></Row>
            <Row><Col>Olin Blodgett</Col><Col>MGI</Col><Col>A-Team</Col></Row>
            <Row><Col>Jeff De Pons</Col><Col>RGD</Col><Col>A-Team</Col></Row>
            <Row><Col>Shuai Weng</Col><Col>SGD</Col><Col>Blue-Team</Col></Row>
            <Row><Col>Valerio Arnaboldi</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
            <Row><Col>Juancarlos Chan</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
            <Row><Col>Todd Harris</Col><Col>WB</Col><Col></Col></Row>
            <Row><Col>Ryan Martin</Col><Col>ZFIN</Col><Col></Col></Row>
          </Container>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default LoginHelp
