import {useSelector} from "react-redux";
import TopicEntityCreateSGD from "./topic_entity_tag/TopicEntityCreateSGD";
import TopicEntityCreate from "./topic_entity_tag/TopicEntityCreate";
import TopicEntityTable from "./topic_entity_tag/TopicEntityTable";
import EntityCountsByMod from "./shared/EntityCountsByMod";

const BiblioEntity = () => {
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : cognitoMod;
  if (accessLevel === 'SGD') {
    return (
      <>
        <EntityCountsByMod key="entityCounts" />
        <TopicEntityCreateSGD key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
    );
  };

  return (
      <>
        <EntityCountsByMod key="entityCounts" />
        <TopicEntityCreate key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
  );
}

export default BiblioEntity;
