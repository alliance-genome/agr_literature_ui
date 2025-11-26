import {useSelector} from "react-redux";
import {AlertAteamApiDown} from "../ATeamAlert";
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
        <AlertAteamApiDown />
        <TopicEntityCreateSGD key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
    );
  };
    
  return (
      <>
        <AlertAteamApiDown />
        <TopicEntityCreate key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
  );
}

export default BiblioEntity;
