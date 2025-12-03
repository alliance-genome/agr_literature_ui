import {useSelector} from "react-redux";
import TopicEntityCreateSGD from "./topic_entity_tag/TopicEntityCreateSGD";
import TopicEntityCreate from "./topic_entity_tag/TopicEntityCreate";
import TopicEntityTable from "./topic_entity_tag/TopicEntityTable";

const BiblioEntity = () => {
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : cognitoMod;
  if (accessLevel === 'SGD') {
    return (
      <>
        <TopicEntityCreateSGD key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
    );
  };
    
  return (
      <>
        <TopicEntityCreate key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
  );
}

export default BiblioEntity;
