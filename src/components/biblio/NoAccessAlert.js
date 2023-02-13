import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert'

const NoAccessAlert = () => { 
  return (
    <Container>
      <Alert variant="danger">This feature is only available for logged in users.</Alert>
    </Container>
  ); }

export default NoAccessAlert;
